"use client";

import React, { useState, useRef } from "react";
import {
  Bug,
  Sparkle,
  ShieldWarning,
  Camera,
  CheckCircle,
  X,
  Smiley,
  SmileyMeh,
  SmileySad,
  PaperPlaneRight,
  Info,
  Envelope,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface Feedback1Props {
  className?: string;
  defaultEmail?: string;
  recipientEmail?: string;
}

type FeedbackCategory = "bug" | "feature" | "misclassification" | "general";
type SentimentLevel = 1 | 2 | 3 | 4 | 5;

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
  Icon: React.ElementType;
}[] = [
  {
    id: "misclassification",
    label: "False Signal",
    description: "Model misclassified a real or synthetic piece of media",
    Icon: ShieldWarning,
  },
  {
    id: "bug",
    label: "Bug Report",
    description: "An interface error, broken link, or unexpected behavior",
    Icon: Bug,
  },
  {
    id: "feature",
    label: "Feature Idea",
    description: "Suggest a forensic model, wire source, or workflow improvement",
    Icon: Sparkle,
  },
  {
    id: "general",
    label: "General Feedback",
    description: "Thoughts, impressions, or questions regarding Veritas",
    Icon: Envelope,
  },
];

const SENTIMENTS: { level: SentimentLevel; label: string; Icon: React.ElementType }[] = [
  { level: 1, label: "Frustrating", Icon: SmileySad },
  { level: 2, label: "Needs work", Icon: SmileySad },
  { level: 3, label: "Neutral", Icon: SmileyMeh },
  { level: 4, label: "Good", Icon: Smiley },
  { level: 5, label: "Exceptional", Icon: Smiley },
];

function getClientMetadata() {
  if (typeof window === "undefined") {
    return { url: "", viewport: "", userAgent: "" };
  }
  return {
    url: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent.slice(0, 100),
  };
}

export default function Feedback1({
  className,
  defaultEmail = "",
  recipientEmail = "muditagrawal03@gmail.com",
}: Feedback1Props) {
  const [category, setCategory] = useState<FeedbackCategory>("misclassification");
  const [sentiment, setSentiment] = useState<SentimentLevel>(4);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailtoLink, setMailtoLink] = useState<string | null>(null);
  const [gmailLink, setGmailLink] = useState<string | null>(null);
  const [needsActivation, setNeedsActivation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle direct paste of image from clipboard (Cmd+V / Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const processImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string);
      setScreenshotName(file.name || "pasted-screenshot.png");
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your feedback or observation.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const metadata = getClientMetadata();
    const payload = {
      category,
      sentiment: SENTIMENTS.find((s) => s.level === sentiment)?.label || sentiment,
      message,
      email,
      screenshot,
      metadata,
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setMailtoLink(data.mailtoBackup || null);
      setGmailLink(data.gmailLink || null);
      setNeedsActivation(!!data.needsActivation);
      setSubmitted(true);
    } catch (err: unknown) {
      console.warn("Direct feedback relay failed, providing email fallback:", err);
      // Construct fallback mailto directly
      const subject = encodeURIComponent(`[Veritas Feedback] [${category.toUpperCase()}]`);
      const body = encodeURIComponent(
        `Category: ${category}\nSentiment: ${sentiment}\nUser: ${email || "Anonymous"}\n\nMessage:\n${message}\n\nMetadata: ${metadata.url} (${metadata.viewport})`
      );
      setMailtoLink(`mailto:${recipientEmail}?subject=${subject}&body=${body}`);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMessage("");
    setScreenshot(null);
    setScreenshotName(null);
    setSubmitted(false);
    setError(null);
  };

  return (
    <div
      id="feedback"
      className={cn(
        "relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#08080a]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_24px_70px_-16px_rgba(0,0,0,0.85)]",
        className
      )}
      onPaste={handlePaste}
    >
      {/* Specular Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
      />

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.form
            key="feedback-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-mono text-xs font-semibold tracking-wider uppercase text-blue-400">
                  Direct Channel · Mudit Agrawal
                </span>
              </div>
              <h3 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white">
                Help Calibrate Veritas
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Report a false detection, suggest a forensic sensor, or share observations. Submissions are delivered directly to{" "}
                <span className="font-medium text-neutral-200">{recipientEmail}</span>.
              </p>
            </div>

            {/* Category Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300">Feedback Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.Icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all select-none text-xs gap-1.5",
                        isSelected
                          ? "border-blue-500/60 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/10 hover:text-neutral-200"
                      )}
                    >
                      <Icon size={18} className={isSelected ? "text-blue-400" : "text-neutral-500"} />
                      <span className="font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sentiment / Rating Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-neutral-300">Experience Rating</label>
                <span className="text-neutral-400">
                  {SENTIMENTS.find((s) => s.level === sentiment)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 p-1 rounded-xl border border-white/5 bg-white/[0.02]">
                {SENTIMENTS.map((item) => {
                  const Icon = item.Icon;
                  const isSelected = sentiment === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setSentiment(item.level)}
                      title={item.label}
                      className={cn(
                        "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
                      )}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Area with Clipboard Paste Detection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="feedback-message" className="font-medium text-neutral-300">
                  Observation or Details <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-neutral-500">{message.length}/1500</span>
              </div>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1500))}
                rows={4}
                required
                placeholder="What did you observe? e.g., 'The spectral voice clone test on the BBC sample showed high latency', or 'Would love a direct C2PA certificate viewer'..."
                className="w-full rounded-xl border border-white/10 bg-[#040406] p-3.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors resize-y min-h-[100px]"
              />
            </div>

            {/* Screenshot Attachment Zone */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Screenshot (Optional)</span>
                <span className="text-[11px] text-neutral-500">Paste with Cmd+V or Browse</span>
              </label>

              {screenshot ? (
                <div className="relative flex items-center gap-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/[0.05] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot}
                    alt="Attached screenshot"
                    className="size-14 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{screenshotName}</p>
                    <p className="text-[11px] text-blue-400 font-mono mt-0.5">Attached & ready to send</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotName(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Remove screenshot"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20 transition-all cursor-pointer text-xs text-neutral-400"
                >
                  <Camera size={17} className="text-neutral-500" />
                  <span>Click to upload image or paste directly into this window</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Optional Email */}
            <div className="space-y-2">
              <label htmlFor="feedback-email" className="text-xs font-medium text-neutral-300">
                Your Email <span className="text-neutral-500 font-normal">(Optional, for replies)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@newsroom.org"
                className="w-full rounded-xl border border-white/10 bg-[#040406] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
              />
            </div>

            {/* Diagnostic Environment Badge */}
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 px-1">
              <div className="flex items-center gap-1.5">
                <Info size={13} className="text-neutral-600" />
                <span>Telemetry: Viewport &amp; URL auto-attached</span>
              </div>
              <span className="truncate max-w-[200px]">Delivery: {recipientEmail}</span>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm py-3 px-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(255,255,255,0.12)] active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Transmitting Feedback...</span>
                </>
              ) : (
                <>
                  <PaperPlaneRight size={16} weight="fill" />
                  <span>Send Direct to Mudit</span>
                </>
              )}
            </button>
          </motion.form>
        ) : (
          /* Confirmation Success State */
          <motion.div
            key="feedback-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center py-8 space-y-5"
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle size={32} weight="fill" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-semibold text-white">Feedback Dispatched</h3>
              <p className="text-sm text-neutral-400 max-w-[46ch] mx-auto leading-relaxed">
                Your report has been routed to <span className="text-neutral-200 font-medium">{recipientEmail}</span>.
              </p>
              {needsActivation && (
                <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 text-left max-w-md mx-auto">
                  <p className="font-semibold text-amber-300">Action Required for Automated Delivery:</p>
                  <p className="mt-1 text-amber-200/90">
                    FormSubmit sent a one-time activation email to <strong>{recipientEmail}</strong>. Please check your Gmail (including Spam) and click &ldquo;Activate Form&rdquo; so future submissions flow directly.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {gmailLink && (
                <a
                  href={gmailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg"
                >
                  <span>Open Direct Draft in Gmail</span>
                  <ArrowSquareOut size={14} />
                </a>
              )}
              {mailtoLink && (
                <a
                  href={mailtoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-neutral-300 hover:text-white px-3.5 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <span>Open in Mail Client</span>
                  <ArrowSquareOut size={14} />
                </a>
              )}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                Send another message
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
