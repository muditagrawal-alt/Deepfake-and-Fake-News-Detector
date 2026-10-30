"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Eye,
  EyeSlash,
  GithubLogo,
  GoogleLogo,
  LockKey,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { signIn } from "next-auth/react";

export interface Authentication1Props {
  providers?: { id: string; name: string }[];
  onSuccess?: () => void;
  className?: string;
}

export default function Authentication1({
  providers = [],
  className = "",
}: Authentication1Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [error, setError] = useState("");

  const configuredProviders = new Set(providers.map((p) => p.id));
  const hasGitHub = configuredProviders.size === 0 || configuredProviders.has("github");
  const hasGoogle = configuredProviders.size === 0 || configuredProviders.has("google");

  async function handleProviderSignIn(providerId: string) {
    setPendingProvider(providerId);
    setError("");
    try {
      await signIn(providerId, { redirectTo: "/?signedIn=1" });
    } catch {
      setError("Authentication could not be initiated. Check OAuth credentials.");
      setPendingProvider(null);
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setEmailSubmitted(true);
  }

  return (
    <div className={`w-full max-w-[440px] mx-auto ${className}`}>
      {/* Outer Card with Ambient Specular Rim */}
      <div className="relative rounded-2xl border border-white/10 bg-[#08080a]/90 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_24px_70px_-16px_rgba(0,0,0,0.85)]">
        {/* Subtle Top Edge Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        {/* Brand Shield Logo */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="/veritas-mark.png"
            alt="Veritas Shield Mark"
            width={44}
            height={46}
            priority
            className="size-11 object-contain drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)]"
          />

          {/* Heading */}
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-white">
            {mode === "signin" ? "Sign in to Veritas" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-xs text-white/50 leading-relaxed max-w-[32ch]">
            {mode === "signin"
              ? "Access your private multi-modal verification workspace and key registry."
              : "Start inspecting digital media claims with calibrated evidentiary certainty."}
          </p>

          {/* Sign In / Sign Up Mode Switcher Tabs */}
          <div className="mt-6 flex w-full rounded-lg border border-white/10 bg-white/[0.03] p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
                setEmailSubmitted(false);
              }}
              className={`flex-1 rounded-md py-1.5 text-center transition-all ${
                mode === "signin"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setEmailSubmitted(false);
              }}
              className={`flex-1 rounded-md py-1.5 text-center transition-all ${
                mode === "signup"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* 3-Up Provider Row */}
        <div className="mt-6">
          <span className="block text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2.5 text-center">
            Continue with
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {/* GitHub */}
            <button
              type="button"
              disabled={Boolean(pendingProvider) || !hasGitHub}
              onClick={() => handleProviderSignIn("github")}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white transition-all hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <GithubLogo size={18} weight="fill" />
              <span>GitHub</span>
              {pendingProvider === "github" ? (
                <span className="size-3 animate-spin rounded-full border-2 border-white border-r-transparent" />
              ) : !hasGitHub ? (
                <span className="text-[10px] text-white/30">(Off)</span>
              ) : null}
            </button>

            {/* Google */}
            <button
              type="button"
              disabled={Boolean(pendingProvider) || !hasGoogle}
              onClick={() => handleProviderSignIn("google")}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white transition-all hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <GoogleLogo size={18} weight="bold" />
              <span>Google</span>
              {pendingProvider === "google" ? (
                <span className="size-3 animate-spin rounded-full border-2 border-white border-r-transparent" />
              ) : !hasGoogle ? (
                <span className="text-[10px] text-white/30">(Off)</span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-[#08080a] px-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
            or continue with email
          </span>
        </div>

        {/* Form Body */}
        <AnimatePresence mode="wait">
          {emailSubmitted ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center font-mono"
            >
              <CheckCircle size={24} className="mx-auto text-white/80 mb-2" />
              <h3 className="text-sm font-semibold text-white">
                Verification link dispatched
              </h3>
              <p className="mt-1 text-xs text-white/50 font-sans leading-relaxed">
                We sent a secure sign-in token to <span className="text-white font-mono">{email}</span>. Please click the link to enter your workspace.
              </p>
              <button
                type="button"
                onClick={() => setEmailSubmitted(false)}
                className="mt-4 text-xs text-white/60 hover:text-white underline cursor-pointer"
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleEmailSubmit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {mode === "signup" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-white/70 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-white/25 focus:border-white/30 focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-white/70 mb-1.5"
                >
                  Work or Organization Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@newsroom.org"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-white/25 focus:border-white/30 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-white/70"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setError("Contact your administrator or use OAuth providers.")}
                      className="text-[11px] text-white/40 hover:text-white transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 pr-10 text-xs text-white placeholder-white/25 focus:border-white/30 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-3.5 rounded border border-white/20 bg-white/[0.05] accent-white cursor-pointer"
                  />
                  <span className="text-xs text-white/60">Keep me signed in</span>
                </label>
                <span className="font-mono text-[10px] text-white/30">
                  30-DAY SESSION
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200"
                >
                  {error}
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black py-2.5 text-xs font-semibold transition-all hover:bg-white/90 active:scale-[0.98] cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.12)]"
              >
                <span>{mode === "signin" ? "Sign In to Workspace" : "Create Account"}</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Security & Privacy Provenance Note */}
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-white/40">
          <div className="flex items-center gap-1.5">
            <LockKey size={13} aria-hidden />
            <span>EPHEMERAL RAM ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} aria-hidden />
            <span>ZERO DISK PERSISTENCE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
