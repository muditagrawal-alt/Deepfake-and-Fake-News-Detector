"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  CaretDown,
  CaretLeft,
  ClockCounterClockwise,
  FilmStrip,
  GithubLogo,
  GoogleLogo,
  Image as ImageIcon,
  Info,
  Key,
  List,
  Newspaper,
  Plus,
  ShieldCheck,
  SignOut,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { signIn, signOut } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Intro from "@/components/Intro";
import Analyzer, { type AnalyzerMode } from "@/components/Analyzer";
import ResultCard from "@/components/ResultCard";
import {
  clearHistory,
  deleteAccount,
  deleteApiKey,
  getAccount,
  getHealth,
  getHistory,
  saveApiKey,
  setHistoryEnabled,
  type AccountStatus,
  type AnalysisResult,
  type HistoryEntry,
  type Health,
} from "@/lib/api";

type User = { id: string; name?: string | null; email?: string | null; image?: string | null };
type AuthProvider = { id: string; name: string };
type Stage = "intro" | "auth" | "workspace";
type Section = "check" | "history" | "keys" | "method" | "capabilities" | "guide";

const API_PROVIDERS = [
  { id: "gemini", name: "Google Gemini", kind: "Verdict model · recommended", url: "https://aistudio.google.com/app/apikey", mark: "G", detail: "Runs the full analysis, including native video review." },
  { id: "openrouter", name: "OpenRouter", kind: "Verdict model · video uses frames", url: "https://openrouter.ai/settings/keys", mark: "OR", detail: "Routes structured image and text analysis through a model gateway." },
  { id: "groq", name: "Groq", kind: "Optional · video transcription", url: "https://console.groq.com/keys", mark: "GQ", detail: "Adds speech-to-text when video is analyzed as sampled frames." },
  { id: "tavily", name: "Tavily", kind: "Optional · web research", url: "https://app.tavily.com/home", mark: "T", detail: "Adds a dedicated search API for finding independent sources." },
] as const;

function MicrosoftMark() {
  return (
    <span aria-hidden className="grid size-5 grid-cols-2 grid-rows-2 gap-[2px]">
      <i className="bg-[#f25022]" /><i className="bg-[#7fba00]" />
      <i className="bg-[#00a4ef]" /><i className="bg-[#ffb900]" />
    </span>
  );
}

function ProviderLogo({ id }: { id: string }) {
  if (id === "google") return <GoogleLogo size={21} weight="bold" aria-hidden />;
  if (id === "github") return <GithubLogo size={21} weight="fill" aria-hidden />;
  return <MicrosoftMark />;
}

function AuthScreen({ providers }: { providers: AuthProvider[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const configured = new Set(providers.map((provider) => provider.id));
  const allProviders = [
    { id: "google", name: "Google" },
    { id: "github", name: "GitHub" },
    { id: "microsoft-entra-id", name: "Microsoft" },
  ];

  async function continueWith(provider: AuthProvider) {
    setPending(provider.id);
    setError("");
    try {
      await signIn(provider.id, { redirectTo: "/?signedIn=1" });
    } catch {
      setError("Sign-in could not start. Check the OAuth app settings and try again.");
      setPending(null);
    }
  }

  return (
    <section aria-label="Sign in" className="min-h-[calc(100dvh-3.5rem)] px-4 py-14 sm:py-20 flex items-center justify-center">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        className="w-full max-w-lg rounded-panel border border-line bg-elev p-7 shadow-panel sm:p-9">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-3">
          <ShieldCheck size={16} aria-hidden /> Private workspace
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Sign in or create your account</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">Manage your API keys and optionally save results. Your three free detections work across news, images and video.</p>

        <div className="mt-7 space-y-3">
          {allProviders.map((provider) => {
            const enabled = configured.has(provider.id);
            return (
              <button key={provider.id} type="button" disabled={!enabled || !!pending}
                onClick={() => void continueWith(provider)}
                className="flex w-full items-center gap-3 rounded-control border border-line-strong bg-bg px-4 py-3 text-left text-sm font-medium transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-55">
                <ProviderLogo id={provider.id} />
                <span className="flex-1">Continue with {provider.name}</span>
                {pending === provider.id ? <span className="size-4 animate-spin rounded-full border-2 border-accent border-r-transparent" />
                  : !enabled ? <span className="text-xs font-normal text-ink-3">Not configured</span> : null}
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="mt-4 rounded-control bg-fake-soft px-3 py-2 text-sm text-fake">{error}</p>}
        {!providers.length && (
          <p className="mt-5 rounded-control border border-warn/30 bg-warn-soft p-3 text-sm leading-relaxed text-ink-2">
            Sign-in providers need OAuth app credentials in the frontend environment. See the setup steps in the project README.
          </p>
        )}
        <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-3">
          By continuing, you agree to send submitted content to the configured analysis providers. Uploaded files are removed after processing; results are saved only when you turn on Save detection history.
        </p>
      </motion.section>
    </section>
  );
}

function ApiKeyManager({
  account,
  onChange,
  inModal = false,
}: {
  account: AccountStatus | null;
  onChange: (provider: string) => Promise<void>;
  inModal?: boolean;
}) {
  const [provider, setProvider] = useState("gemini");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const saved = new Set(account?.keys || []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account?.byok_ready || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveApiKey(provider, key);
      setKey("");
      setMessage(`${API_PROVIDERS.find((item) => item.id === provider)?.name} key saved securely.`);
      await onChange(provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this API key.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(providerId: string) {
    setError("");
    setMessage("");
    try {
      await deleteApiKey(providerId);
      await onChange(providerId);
      setMessage(`${API_PROVIDERS.find((item) => item.id === providerId)?.name} key removed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove this API key.");
    }
  }

  return (
    <div className={inModal ? "" : "space-y-6"}>
      {!account?.byok_ready && (
        <p role="status" className="rounded-control border border-warn/30 bg-warn-soft p-3 text-sm leading-relaxed text-ink-2">
          Encrypted key storage is not configured on this deployment yet. The API administrator must set BYOK_ENCRYPTION_KEY before keys can be saved.
        </p>
      )}
      <div className="space-y-2">
        {API_PROVIDERS.map((item) => (
          <article key={item.id} className="flex flex-col gap-3 rounded-control border border-line bg-bg p-3 sm:flex-row sm:items-center">
            <a href={item.url} target="_blank" rel="noreferrer noopener" className="flex min-w-0 flex-1 items-center gap-3 rounded-control p-1 transition-colors hover:bg-elev">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-elev font-mono text-xs font-semibold text-ink-2">{item.mark}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <span className="text-[11px] text-ink-3">{item.kind}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-2">{item.detail}</span>
              </span>
              <ArrowSquareOut size={15} className="shrink-0 text-ink-3" aria-hidden />
            </a>
            <div className="flex shrink-0 items-center gap-3">
              {saved.has(item.id) && <span className="text-xs font-medium text-real">Saved</span>}
              {saved.has(item.id) && (
                <button type="button" aria-label={`Remove ${item.name} key`} onClick={() => void remove(item.id)} className="rounded p-1 text-ink-3 hover:bg-fake-soft hover:text-fake">
                  <Trash size={17} aria-hidden />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="rounded-control border border-line bg-bg p-4">
        <p className="mb-4 text-xs leading-relaxed text-ink-3">When both verdict providers are saved, Gemini is selected. Remove the Gemini key to switch to OpenRouter.</p>
        <label htmlFor="key-provider" className="block text-sm font-medium">Provider</label>
        <select id="key-provider" value={provider} onChange={(event) => setProvider(event.target.value)}
          className="mt-2 w-full rounded-control border border-line-strong bg-elev px-3 py-2.5 text-sm">
          {API_PROVIDERS.map((item) => <option key={item.id} value={item.id}>{item.name}{item.id === "gemini" || item.id === "openrouter" ? " · verdict model" : " · optional"}</option>)}
        </select>
        <label htmlFor="provider-key" className="mt-4 block text-sm font-medium">API key</label>
        <input id="provider-key" type="password" autoComplete="new-password" value={key} onChange={(event) => setKey(event.target.value)}
          placeholder="Paste your key" maxLength={1024} className="mt-2 w-full rounded-control border border-line-strong bg-elev px-3 py-2.5 text-sm" />
        <p className="mt-2 text-xs leading-relaxed text-ink-3">Keys are encrypted before storage and never shown again. Gemini or OpenRouter is required for checks after the free limit; Groq and Tavily are optional.</p>
        <button type="submit" disabled={!account?.byok_ready || busy || key.trim().length < 20}
          className="mt-4 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Saving key…" : "Save API key"}
        </button>
        {message && <p role="status" className="mt-3 text-sm text-real">{message}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-fake">{error}</p>}
      </form>
    </div>
  );
}

function ByokDialog({
  account,
  onClose,
  onChange,
}: {
  account: AccountStatus | null;
  onClose: () => void;
  onChange: (provider: string) => Promise<void>;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="byok-title" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-panel border border-line bg-elev p-5 shadow-panel sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Key size={20} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Free checks complete</p>
            <h2 id="byok-title" className="mt-1 text-2xl font-semibold tracking-tight">Bring your own API key</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">You used the three shared free detections. Add a Gemini or OpenRouter key to keep checking content. The provider may charge your account for usage.</p>
          </div>
          <button ref={closeButton} type="button" aria-label="Close API key dialog" onClick={onClose} className="rounded-control p-2 text-ink-3 hover:bg-bg hover:text-ink"><X size={18} aria-hidden /></button>
        </div>
        <div className="mt-5">
          <ApiKeyManager account={account} inModal onChange={onChange} />
        </div>
        <p className="mt-4 text-xs text-ink-3">Your API key is used only for your checks. Remove it any time from API keys in the sidebar.</p>
      </motion.section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function VerdictLabel({ result }: { result: AnalysisResult }) {
  const color = result.verdict === "LIKELY_REAL" ? "text-real" : result.verdict === "LIKELY_FAKE" ? "text-fake" : "text-warn";
  const text = result.verdict === "LIKELY_REAL" ? "Likely real" : result.verdict === "LIKELY_FAKE" ? "Likely fake" : "Uncertain";
  return <span className={`text-xs font-semibold ${color}`}>{text} · {Math.round(result.confidence * 100)}%</span>;
}

function GuidedTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const steps = [
    {
      eyebrow: "01 · Choose what to check",
      title: "Start with news, an image or a video",
      body: "Use the tabs in the detector to choose a format. News checks a public article URL; images and videos are uploaded for analysis.",
    },
    {
      eyebrow: "02 · Add context",
      title: "Tell Veritas what you want verified",
      body: "Paste an article link or select a media file. For an image, add the caption or claim that came with it so the analysis has useful context.",
    },
    {
      eyebrow: "03 · Read the evidence",
      title: "Treat the result as an estimate",
      body: "Review the verdict, reasoning, signals, cited sources and caveats together. The confidence value is model-reported and is not a calibrated probability.",
    },
    {
      eyebrow: "04 · Your workspace",
      title: "Keep results, control your keys",
      body: "Your first three checks are shared across all formats. Turn on Save detection history in the sidebar if you want results saved; uploaded media is never saved. After the free checks, add a Gemini or OpenRouter key from API keys.",
    },
  ];
  const current = steps[step];

  return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <motion.section role="dialog" aria-modal="true" aria-labelledby="tour-title"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 14, scale: reduceMotion ? 1 : 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
          transition={{ duration: reduceMotion ? 0 : 0.24 }}
          onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
          className="w-full max-w-xl rounded-panel border border-line bg-elev p-6 shadow-panel sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">A quick tour · {step + 1} of {steps.length}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-ink-3">{current.eyebrow}</p>
              <h2 id="tour-title" className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{current.body}</p>
            </div>
            <button type="button" aria-label="Close walkthrough" onClick={onClose} className="rounded-control p-2 text-ink-3 hover:bg-bg hover:text-ink"><X size={18} aria-hidden /></button>
          </div>
          <div className="mt-7 flex gap-1.5" aria-hidden>
            {steps.map((item, index) => <span key={item.eyebrow} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-line-strong"}`} />)}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="rounded-control px-3 py-2 text-sm text-ink-3 hover:bg-bg hover:text-ink">Skip tour</button>
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-control border border-line px-3 py-2 text-sm text-ink-2 hover:bg-bg">Back</button>}
              <button type="button" onClick={() => step === steps.length - 1 ? onClose() : setStep((value) => value + 1)}
                className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">{step === steps.length - 1 ? "Start checking" : "Next"}</button>
            </div>
          </div>
        </motion.section>
      </motion.div>
  );
}

function Workspace({ user }: { user: User }) {
  const [active, setActive] = useState<Section>("check");
  const [detectionMode, setDetectionMode] = useState<AnalyzerMode>("news");
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [byokOpen, setByokOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyPreferenceBusy, setHistoryPreferenceBusy] = useState(false);
  const greetingTimer = useRef<number | null>(null);
  const initialWorkspaceLoad = useRef<Promise<{ account: AccountStatus; history: HistoryEntry[] } | null> | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scrollScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const refreshWorkspace = useCallback(async (triggerKeyPrompt = true) => {
    try {
      const [nextAccount, nextHistory] = await Promise.all([getAccount(), getHistory()]);
      setAccount(nextAccount);
      setHistory(nextHistory);
      setError("");
      if (triggerKeyPrompt && nextAccount.free_remaining === 0
        && !nextAccount.keys.some((keyName) => keyName === "gemini" || keyName === "openrouter")) {
        setByokOpen(true);
      }
      return { account: nextAccount, history: nextHistory };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load your account. Check that the API is online.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!initialWorkspaceLoad.current) initialWorkspaceLoad.current = refreshWorkspace(false);
    void initialWorkspaceLoad.current.then((initial) => {
      if (cancelled) return;
      if (!initial) {
        setWorkspaceReady(true);
        return;
      }
      const firstName = user.name?.trim().split(/\s+/)[0] || "there";
      const greetings = initial.account.is_new_user
        ? [`Welcome, ${firstName}`, `Great to have you here, ${firstName}`, `Let’s get started, ${firstName}`]
        : [`Welcome back, ${firstName}`, `Good to see you again, ${firstName}`, `Ready for another check, ${firstName}`];
      setWelcomeMessage(greetings[Math.floor(Math.random() * greetings.length)]);
      greetingTimer.current = window.setTimeout(() => {
        setWelcomeMessage("");
        setWorkspaceReady(true);
        if (initial.account.is_new_user) setGuideOpen(true);
        else if (initial.account.free_remaining === 0
          && !initial.account.keys.some((keyName) => keyName === "gemini" || keyName === "openrouter")) setByokOpen(true);
      }, 2400);
    });
    return () => {
      cancelled = true;
      if (greetingTimer.current !== null) window.clearTimeout(greetingTimer.current);
    };
  }, [refreshWorkspace, user.name]);

  useEffect(() => {
    if (active !== "capabilities" || health) return;
    let cancelled = false;
    void getHealth().then((data) => { if (!cancelled) { setHealth(data); setHealthError(""); } })
      .catch((reason: unknown) => { if (!cancelled) setHealthError(reason instanceof Error ? reason.message : "Could not read deployment status."); });
    return () => { cancelled = true; };
  }, [active, health]);

  async function onKeyChange(provider: string) {
    await refreshWorkspace(false);
    if (provider === "gemini" || provider === "openrouter") setByokOpen(false);
  }

  async function deleteAllHistory() {
    if (!window.confirm("Delete all saved detection history?")) return;
    setHistoryBusy(true);
    try {
      await clearHistory();
      setHistory([]);
      setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not clear history.");
    } finally {
      setHistoryBusy(false);
    }
  }

  async function changeHistoryPreference(enabled: boolean) {
    if (!account || historyPreferenceBusy) return;
    setHistoryPreferenceBusy(true);
    try {
      const preference = await setHistoryEnabled(enabled);
      setAccount((current) => current ? { ...current, history_enabled: preference.history_enabled } : current);
      if (enabled) {
        setHistory(await getHistory());
      } else {
        setHistory([]);
        setSelected(null);
      }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the history setting.");
    } finally {
      setHistoryPreferenceBusy(false);
    }
  }

  function exportHistory() {
    if (!history.length) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veritas-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function removeAccount() {
    if (!window.confirm("Permanently delete your account, saved API keys, and detection history? This cannot be undone.")) return;
    setAccountDeleting(true);
    try {
      await deleteAccount();
      await signOut({ redirectTo: "/" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this account.");
      setProfileMenuOpen(false);
    } finally {
      setAccountDeleting(false);
    }
  }

  const capabilityItems: { id: string; label: string; Icon: typeof Plus; section: Section; mode?: AnalyzerMode }[] = [
    { id: "news", label: "News detection", Icon: Newspaper, section: "check", mode: "news" },
    { id: "image", label: "Image detection", Icon: ImageIcon, section: "check", mode: "image" },
    { id: "video", label: "Video detection", Icon: FilmStrip, section: "check", mode: "video" },
    { id: "history", label: "History", Icon: ClockCounterClockwise, section: "history" },
    { id: "keys", label: "API keys", Icon: Key, section: "keys" },
    { id: "method", label: "How it works", Icon: Info, section: "method" },
    { id: "capabilities", label: "Deployment status", Icon: ShieldCheck, section: "capabilities" },
    { id: "guide", label: "Guided tour", Icon: Sparkle, section: "guide" },
  ];
  const greeting = user.name?.trim().split(/\s+/)[0] || "there";

  function navigate(section: Section) {
    if (section === "guide") {
      setGuideOpen(true);
      setMobileMenuOpen(false);
      setProfileMenuOpen(false);
      return;
    }
    setActive(section);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    if (section !== "history") setSelected(null);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function openCapability(item: (typeof capabilityItems)[number]) {
    if (item.mode) setDetectionMode(item.mode);
    navigate(item.section);
  }

  const itemIcon = (modality: AnalysisResult["modality"]) => modality === "news" ? Newspaper : modality === "image" ? ImageIcon : FilmStrip;
  const capabilityRows = health ? [
    { name: "Article extraction and claim research", state: health.engine.research_mode === "closed" ? "Research disabled" : `Using ${health.engine.researcher || "configured researcher"}`, detail: "Open mode searches for independent pages; DuckDuckGo works without a key and Tavily is optional." },
    { name: "Image metadata and provenance", state: "Available", detail: "The detector reads image metadata and checks supported C2PA provenance information; image captions add claim context." },
    { name: "Pixel classifier", state: health.engine.onnx_detector ? health.onnx_ready ? "Ready" : health.onnx_error ? "Could not load" : "Loading" : "Off", detail: health.engine.onnx_detector ? `Configured model: ${health.engine.onnx_detector}.` : "Optional ONNX classifier is disabled in this deployment. The administrator can enable it with ENABLE_ONNX_DETECTOR=true after considering its memory cost." },
    { name: "Video inspection", state: health.engine.video_strategy === "frames" ? "Sampled frames" : "Native video", detail: health.engine.video_strategy === "frames" ? "The current backend samples frames; optional Groq credentials add a transcript." : "The shared backend sends video to its native video model. OpenRouter BYOK checks use sampled frames." },
    { name: "Speech transcription", state: health.providers.groq ? "Groq configured" : "Optional · not configured", detail: health.providers.groq ? "Available for video checks that use sampled frames." : "Add GROQ_API_KEY to the backend to transcribe speech in sampled-frame video checks." },
    { name: "Local Ollama model", state: health.engine.backend === "ollama" ? `Active · ${health.engine.model}` : "Available in the repository", detail: health.engine.backend === "ollama" ? "This deployment is using its local Ollama model." : "Ollama can run the analysis locally when configured by the operator; it is not selectable from this account." },
    { name: "Offline evaluation tools", state: "Developer workflow", detail: "The repository includes an evaluation pipeline for maintainers. It does not run during user checks." },
  ] : [];

  return (
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <motion.div aria-hidden className="fixed left-0 right-0 top-14 z-30 h-[2px] origin-left bg-accent" style={reduceMotion ? undefined : { scaleX: scrollScale }} />
      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${mobileMenuOpen ? "fixed inset-0 z-40 block bg-bg" : "hidden"} top-14 h-[calc(100dvh-3.5rem)] w-full shrink-0 border-r border-line bg-bg transition-[width] duration-200 md:sticky md:top-14 md:block ${sidebarExpanded ? "md:w-64" : "md:w-[76px]"}`}>
          <div className={`flex h-full min-h-0 flex-col overflow-y-auto p-4 ${sidebarExpanded ? "" : "md:p-2"}`}>
            <div className="flex items-center justify-between px-2 py-3 md:hidden">
              <span className="font-semibold">Workspace menu</span>
              <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="rounded-control p-2 text-ink-2 hover:bg-elev"><X size={20} /></button>
            </div>
            <p className={`px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3 ${sidebarExpanded ? "" : "md:sr-only"}`}>Workspace</p>
            <nav aria-label="Workspace" className="space-y-1">
              <button type="button" title={!sidebarExpanded ? "New detection" : undefined} aria-current={active === "check" ? "page" : undefined} onClick={() => navigate("check")}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors ${active === "check" ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-elev hover:text-ink"}`}>
                <Plus size={18} className={sidebarExpanded ? "" : "md:mx-auto"} aria-hidden /><span className={sidebarExpanded ? "" : "md:sr-only"}>New detection</span>
              </button>
              <div>
                <button type="button" title={!sidebarExpanded ? "Capabilities" : undefined} aria-label="Capabilities" aria-expanded={capabilitiesOpen} aria-controls="capabilities-submenu"
                  onClick={() => setCapabilitiesOpen((value) => !value)}
                  className={`group flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors ${active !== "check" ? "font-medium text-accent" : "text-ink-2 hover:bg-elev hover:text-ink"} ${active !== "check" ? "bg-accent-soft" : ""}`}>
                  <ShieldCheck size={18} className={sidebarExpanded ? "" : "md:mx-auto"} aria-hidden /><span className={sidebarExpanded ? "" : "md:sr-only"}>Capabilities</span>
                  <CaretDown size={15} aria-hidden className={`ml-auto shrink-0 text-ink-3 transition-all ${capabilitiesOpen ? "rotate-180 opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"} ${sidebarExpanded ? "" : "md:hidden"}`} />
                </button>
                <AnimatePresence initial={false}>
                  {capabilitiesOpen && <motion.div id="capabilities-submenu" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className={`overflow-hidden ${sidebarExpanded ? "ml-3 border-l border-line pl-2" : "md:ml-0 md:border-l-0 md:pl-0"}`}>
                    <div className="space-y-1 py-1">
                      {capabilityItems.map((item) => {
                        const Icon = item.Icon;
                        const current = active === item.section && (item.section !== "check" || item.mode === detectionMode);
                        return <button key={item.id} type="button" title={!sidebarExpanded ? item.label : undefined} aria-label={item.label} aria-current={current ? "page" : undefined}
                          onClick={() => openCapability(item)}
                          className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-xs transition-colors ${current ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-elev hover:text-ink"}`}>
                          <Icon size={16} className={sidebarExpanded ? "" : "md:mx-auto"} aria-hidden /><span className={sidebarExpanded ? "" : "md:sr-only"}>{item.label}</span>
                        </button>;
                      })}
                    </div>
                  </motion.div>}
                </AnimatePresence>
              </div>
            </nav>

            {sidebarExpanded ? <div className="mt-7 rounded-panel border border-line bg-elev p-4">
                <div className="flex items-center justify-between text-xs text-ink-2">
                  <span>Free detections</span><span className="tabular-nums">{account ? `${account.free_used}/${account.free_limit}` : "…"}</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${account ? (account.free_used / account.free_limit) * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-3">Shared across news, images and video.</p>
                {account?.free_remaining === 0 && (
                  <button type="button" onClick={() => setByokOpen(true)} className="mt-3 text-xs font-medium text-accent underline underline-offset-2">Add your API key</button>
                )}
              </div> : <button type="button" title={`Free detections: ${account ? `${account.free_used}/${account.free_limit}` : "loading"}`} aria-label={`Free detections: ${account ? `${account.free_used} of ${account.free_limit} used` : "loading"}`}
                onClick={() => { if (account?.free_remaining === 0) setByokOpen(true); }}
                className="mt-5 flex items-center justify-center gap-2 rounded-control border border-line p-2 text-xs text-ink-2 hover:bg-elev">
                <ShieldCheck size={18} aria-hidden /><span className="md:sr-only">{account ? `${account.free_used}/${account.free_limit}` : "…"}</span>
              </button>}

            {sidebarExpanded ? <div className="mt-3 rounded-panel border border-line bg-elev p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Save detection history</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-3">Results only. Media is never stored.</p>
                  </div>
                  <button type="button" role="switch" aria-label="Save detection history" aria-checked={!!account?.history_enabled}
                    disabled={!account || historyPreferenceBusy} onClick={() => void changeHistoryPreference(!account?.history_enabled)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 ${account?.history_enabled ? "bg-accent" : "bg-line-strong"}`}>
                    <span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${account?.history_enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {account?.history_enabled && <p className="mt-2 text-[10px] text-ink-3">Turning this off deletes saved results.</p>}
              </div> : <button type="button" role="switch" aria-label="Save detection history" aria-checked={!!account?.history_enabled}
                title={`Save detection history ${account?.history_enabled ? "on" : "off"}${account?.history_enabled ? "; turning off deletes saved results" : ""}`}
                disabled={!account || historyPreferenceBusy} onClick={() => void changeHistoryPreference(!account?.history_enabled)}
                className={`mt-3 flex w-full items-center justify-center rounded-control border p-2 transition-colors disabled:opacity-60 ${account?.history_enabled ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:bg-elev"}`}>
                <ClockCounterClockwise size={18} aria-hidden />
              </button>}

            <div className="relative mt-auto border-t border-line pt-3">
              <AnimatePresence>
                {profileMenuOpen && <motion.div key="profile-menu" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: reduceMotion ? 0 : 0.16 }}
                  className={`absolute bottom-[calc(100%+0.5rem)] z-50 rounded-panel border border-line bg-elev p-3 shadow-panel ${sidebarExpanded ? "left-0 right-0" : "left-0 w-60"}`}>
                  <div className="border-b border-line px-2 pb-3">
                    <p className="truncate text-sm font-semibold">{user.name || "Veritas user"}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-3">{user.email}</p>
                  </div>
                  <button type="button" onClick={() => navigate("history")} className="mt-2 flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm text-ink-2 hover:bg-bg"><ClockCounterClockwise size={17} aria-hidden /> History</button>
                  <button type="button" onClick={() => navigate("keys")} className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm text-ink-2 hover:bg-bg"><Key size={17} aria-hidden /> API keys</button>
                  <button type="button" onClick={() => void signOut({ redirectTo: "/" })} className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm text-ink-2 hover:bg-bg"><SignOut size={17} aria-hidden /> Sign out</button>
                  <button type="button" disabled={accountDeleting} onClick={() => void removeAccount()} className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm text-fake hover:bg-fake-soft disabled:opacity-50"><Trash size={17} aria-hidden /> {accountDeleting ? "Deleting account…" : "Delete account"}</button>
                </motion.div>}
              </AnimatePresence>
              <button type="button" aria-label={profileMenuOpen ? "Close profile menu" : "Open profile menu"} aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((value) => !value)}
                className={`flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-elev ${sidebarExpanded ? "" : "md:justify-center"}`}>
                {user.image ? <Image src={user.image} unoptimized width={36} height={36} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-full object-cover" />
                  : <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{(user.name || user.email || "V").slice(0, 1).toUpperCase()}</span>}
                <span className={`min-w-0 flex-1 ${sidebarExpanded ? "" : "md:sr-only"}`}>
                  <span className="block truncate text-sm font-medium">{user.name || "Veritas user"}</span>
                  <span className="block truncate text-xs text-ink-3">{user.email}</span>
                </span>
                <List size={16} className={`text-ink-3 ${sidebarExpanded ? "" : "md:hidden"}`} aria-hidden />
              </button>
            </div>
          </div>
        </aside>

        <section aria-label="Workspace content" className="min-w-0 flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pt-7 lg:px-12">
          <div className="mb-5 hidden md:block">
            <button type="button" aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setSidebarExpanded((value) => !value)} className="rounded-control border border-line p-2 text-ink-2 transition-colors hover:bg-elev">
              <List size={18} aria-hidden />
            </button>
          </div>
          <div className="mb-6 flex items-center justify-between gap-3 md:hidden">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm"><List size={17} /> Menu</button>
            <span className="truncate text-xs text-ink-3">{user.email}</span>
          </div>
          <div className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait" initial={false}>
              {workspaceReady ? <motion.div key="workspace" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.32 }}>
            {error && <p role="alert" className="mb-5 rounded-control border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink-2">{error}</p>}
            {active === "check" && (
              <motion.section key="check" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-3"><Sparkle size={15} aria-hidden /> Verification workspace</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                  <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {greeting}.</h1>
                    <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-2">Check an article, image or short video. The result includes its evidence and uncertainty.</p></div>
                  {account && <p className="text-xs text-ink-3">{account.free_remaining} free {account.free_remaining === 1 ? "check" : "checks"} left</p>}
                </div>
                <div className="mt-7">
                  <Analyzer key={detectionMode} selectedMode={detectionMode} onModeChange={setDetectionMode}
                    onAnalysisComplete={() => { void refreshWorkspace(); }} onByokRequired={() => setByokOpen(true)} />
                </div>
                <section className="mt-12 border-t border-line pt-7">
                  <div className="flex items-center justify-between gap-3">
                    <div><h2 className="text-lg font-semibold tracking-tight">Recent checks</h2><p className="mt-1 text-sm text-ink-2">{account?.history_enabled ? "Your latest saved results." : "History saving is off; turn it on in the sidebar to keep results."}</p></div>
                    <button type="button" onClick={() => navigate("history")} className="text-sm text-accent hover:underline">View history</button>
                  </div>
                  {loading ? <p className="mt-4 text-sm text-ink-3">Loading account…</p> : history.length ? (
                    <div className="mt-4 divide-y divide-line rounded-panel border border-line bg-elev">
                      {history.slice(0, 3).map((entry) => {
                        const Icon = itemIcon(entry.modality);
                        return <button key={entry.id} type="button" onClick={() => { setSelected(entry); navigate("history"); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg">
                          <Icon size={18} className="shrink-0 text-ink-3" aria-hidden /><span className="min-w-0 flex-1 truncate text-sm">{entry.input_label || entry.summary}</span><VerdictLabel result={entry.result} />
                        </button>;
                      })}
                    </div>
                  ) : <p className="mt-4 rounded-control border border-dashed border-line-strong px-4 py-5 text-sm text-ink-3">{account?.history_enabled ? "Your completed checks will appear here." : "History is off. Turn on Save detection history in the sidebar to keep future results; uploaded media is never saved."}</p>}
                </section>
              </motion.section>
            )}

            {active === "history" && (
              <motion.section key="history" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
                {selected ? <>
                  <button type="button" onClick={() => setSelected(null)} className="mb-5 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><CaretLeft size={16} /> All history</button>
                  <p className="mb-3 text-xs text-ink-3">{selected.input_label} · {formatDate(selected.created_at)}</p>
                  <ResultCard r={selected.result} />
                </> : <>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">Your account</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Detection history</h1><p className="mt-2 text-sm text-ink-2">{account?.history_enabled ? `Up to ${account.history_limit} recent results. Uploaded media itself is not saved.` : "History saving is off. Use the sidebar switch to save future results; uploaded media is never stored."}</p></div>
                    {!!history.length && <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={exportHistory} className="rounded-control border border-line px-3 py-2 text-xs text-ink-2 hover:bg-bg">Export JSON</button>
                      <button type="button" disabled={historyBusy} onClick={() => void deleteAllHistory()} className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-xs text-ink-2 hover:border-fake hover:text-fake disabled:opacity-50"><Trash size={15} /> {historyBusy ? "Deleting…" : "Clear history"}</button>
                    </div>}
                  </div>
                  {loading ? <p className="mt-6 text-sm text-ink-3">Loading history…</p> : history.length ? (
                    <div className="mt-7 space-y-2">
                      {history.map((entry) => {
                        const Icon = itemIcon(entry.modality);
                        return <button key={entry.id} type="button" onClick={() => setSelected(entry)} className="flex w-full items-start gap-3 rounded-panel border border-line bg-elev p-4 text-left transition-colors hover:border-line-strong hover:bg-bg">
                          <Icon size={19} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{entry.input_label || entry.summary}</span><span className="mt-1 block text-xs text-ink-3">{entry.modality} · {formatDate(entry.created_at)}</span><span className="mt-2 block line-clamp-2 text-sm leading-relaxed text-ink-2">{entry.summary}</span></span>
                          <span className="shrink-0 pt-0.5"><VerdictLabel result={entry.result} /></span>
                        </button>;
                      })}
                    </div>
                  ) : <p className="mt-7 rounded-panel border border-dashed border-line-strong p-6 text-sm text-ink-3">{account?.history_enabled ? "No detections saved yet. Your next completed check will appear here." : "History saving is off. Turn it on with the sidebar switch to keep future results."}</p>}
                </>}
              </motion.section>
            )}

            {active === "keys" && (
              <motion.section key="keys" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">Account settings</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">API keys</h1>
                <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-ink-2">Add a personal provider key for checks after the three free detections. Keys are encrypted at rest; Veritas shows only which providers have a saved key.</p>
                <div className="mt-7"><ApiKeyManager account={account} onChange={onKeyChange} /></div>
              </motion.section>
            )}

            {active === "method" && (
              <motion.section key="method" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">Evidence, then a judgment</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">How a check works</h1>
                <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-ink-2">Veritas gathers observations and evidence, then asks a model to weigh them. The verdict is a reasoned estimate; it cannot prove that media is genuine or fabricated.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    ["01", "Extract", "Read an article, inspect image and video metadata, and identify the claims or observations in the content."],
                    ["02", "Research", "Search for independent pages related to those claims and keep track of the sources returned."],
                    ["03", "Verify", "Compare the content, measured signals and retrieved evidence. The result shows its reasoning and caveats."],
                  ].map(([n, title, body]) => <article key={n} className="rounded-panel border border-line bg-elev p-4"><span className="font-mono text-xs text-ink-3">{n}</span><h2 className="mt-3 text-sm font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p></article>)}
                </div>
                <div className="mt-7 rounded-panel border border-line bg-elev p-5">
                  <h2 className="text-sm font-semibold">Useful additions already built into this project</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
                    <li>• Image captions let you provide the claim that appeared alongside an image.</li>
                    <li>• C2PA, EXIF, XMP, video container metadata and optional pixel classifier signals feed the analysis.</li>
                    <li>• Optional Groq transcription adds speech context to sampled-frame video checks.</li>
                    <li>• Optional Tavily search complements the built-in DuckDuckGo research path.</li>
                    <li>• The research workspace includes local Ollama and a benchmark/evaluation pipeline for offline study.</li>
                  </ul>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-ink-3">These signals can improve the context available to the model, but no accuracy increase is claimed here. The model can still miss manipulation, repeat false information, or overstate confidence.</p>
                <Link href="/about" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">Read the technical method <ArrowSquareOut size={14} /></Link>
              </motion.section>
            )}

            {active === "capabilities" && (
              <motion.section key="capabilities" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">Deployment status</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Capabilities</h1>
                <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-ink-2">These are the analysis paths already present in the codebase and whether the current backend has them enabled. Some options require an operator to configure the deployment.</p>
                {healthError && <p role="alert" className="mt-5 rounded-control border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink-2">{healthError}</p>}
                {!health && !healthError && <p className="mt-6 text-sm text-ink-3">Reading backend capabilities…</p>}
                {health && <>
                  <div className="mt-6 rounded-panel border border-line bg-elev p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-3">Current judgment engine</p>
                    <p className="mt-2 text-sm font-semibold">{health.engine.backend} · {health.engine.model}</p>
                    <p className="mt-1 text-xs text-ink-3">Research mode: {health.engine.research_mode}. Configuration is controlled by the backend operator.</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {capabilityRows.map((row) => {
                      const inactive = ["Off", "Research disabled", "Available in the repository", "Developer workflow", "Could not load", "Loading"].includes(row.state)
                        || row.state.includes("not configured");
                      return <article key={row.name} className="rounded-panel border border-line bg-elev p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-sm font-semibold">{row.name}</h2>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${inactive ? "bg-bg text-ink-3" : "bg-accent-soft text-accent"}`}>{row.state}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-ink-2">{row.detail}</p>
                      </article>;
                    })}
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-ink-3">The verdict confidence is a model-reported estimate, not a calibrated probability. Turning on more signals can add evidence, but this page does not claim measured accuracy gains.</p>
                </>}
              </motion.section>
            )}
              </motion.div> : <motion.div key="welcome" aria-live="polite" className="flex min-h-[55dvh] items-center justify-center px-4 text-center"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.32 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {welcomeMessage ? <motion.div key={welcomeMessage} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={{ duration: reduceMotion ? 0 : 0.28 }}>
                    <Sparkle size={20} className="mx-auto text-accent" aria-hidden />
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{welcomeMessage}</h1>
                    <p className="mt-2 text-sm text-ink-3">Your verification workspace is ready.</p>
                  </motion.div> : <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-ink-3">
                    <span className="mx-auto mb-3 block size-5 animate-spin rounded-full border-2 border-accent border-r-transparent" aria-hidden />Preparing your workspace…
                  </motion.div>}
                </AnimatePresence>
              </motion.div>}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {byokOpen && <ByokDialog account={account} onClose={() => setByokOpen(false)} onChange={onKeyChange} />}
      <AnimatePresence>{guideOpen && <GuidedTour onClose={() => setGuideOpen(false)} />}</AnimatePresence>
    </div>
  );
}

export default function AppFlow({ user, providers, startInWorkspace = false }: {
  user: User | null;
  providers: AuthProvider[];
  startInWorkspace?: boolean;
}) {
  const [stage, setStage] = useState<Stage>(user && startInWorkspace ? "workspace" : "intro");
  const visibleStage: Stage = user && startInWorkspace ? "workspace" : stage;

  useEffect(() => {
    if (user && startInWorkspace) return;
    const timer = window.setTimeout(() => setStage(user ? "workspace" : "auth"), 2300);
    return () => window.clearTimeout(timer);
  }, [user, startInWorkspace]);

  function continueFromIntro() {
    setStage(user ? "workspace" : "auth");
  }

  if (visibleStage === "intro") return <Intro onContinue={continueFromIntro} />;
  if (visibleStage === "auth" || !user) return <AuthScreen providers={providers} />;
  return <Workspace user={user} />;
}
