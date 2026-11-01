import { NextResponse } from "next/server";
import { getClientIp, rateLimiter } from "@/lib/rateLimit";

const ALLOWED_CATEGORIES = new Set(["general", "bug", "feature", "false_positive", "false_negative", "other"]);
const ALLOWED_SENTIMENTS = new Set(["positive", "neutral", "negative", "critical"]);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimiter.check(`feedback:${ip}`, 5, 600); // 5 per 10 minutes

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many feedback requests. Please wait a few minutes before submitting again.",
          retryAfter: limitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": limitResult.resetInSeconds.toString(),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request payload." }, { status: 400 });
    }

    const { category, sentiment, message, email, screenshot, metadata } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required and must not be empty." },
        { status: 400 }
      );
    }

    // Input bounds & sanitization
    const sanitizedMessage = message.trim().slice(0, 5000);
    const safeCategory = typeof category === "string" && ALLOWED_CATEGORIES.has(category.toLowerCase())
      ? category.toLowerCase()
      : "general";
    const safeSentiment = typeof sentiment === "string" && ALLOWED_SENTIMENTS.has(sentiment.toLowerCase())
      ? sentiment.toLowerCase()
      : "not specified";

    let safeEmail = "Anonymous";
    if (typeof email === "string" && email.trim()) {
      const trimmedEmail = email.trim().slice(0, 254);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        safeEmail = trimmedEmail;
      }
    }

    // Strip newlines from subject to prevent SMTP header injection
    const cleanHeaderSummary = sanitizedMessage.slice(0, 60).replace(/[\r\n]+/g, " ");
    const recipient = "muditagrawal03@gmail.com";
    const subject = `[Veritas Feedback] [${safeCategory.toUpperCase()}] ${cleanHeaderSummary}${sanitizedMessage.length > 60 ? "..." : ""}`;

    // Format email payload
    const emailPayload: Record<string, unknown> = {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      to: recipient,
      category: safeCategory,
      sentiment: safeSentiment,
      message: sanitizedMessage,
      user_email: safeEmail,
      timestamp: new Date().toISOString(),
      url: typeof metadata?.url === "string" ? metadata.url.slice(0, 500) : "Landing Page",
      viewport: typeof metadata?.viewport === "string" ? metadata.viewport.slice(0, 100) : "Unknown",
      userAgent: typeof metadata?.userAgent === "string" ? metadata.userAgent.slice(0, 200) : "Unknown",
    };

    if (
      screenshot &&
      typeof screenshot === "string" &&
      screenshot.startsWith("data:image/") &&
      screenshot.length <= 7_000_000 // Cap at ~5MB
    ) {
      emailPayload.has_screenshot = "Yes (Attached in payload)";
      emailPayload.screenshot_preview = screenshot.slice(0, 100) + "...";
    }

    let needsActivation = false;
    let relayMessage = "";

    // Forward to FormSubmit with proper Origin/Referer headers
    try {
      const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://veritas-check.vercel.app",
          Referer: "https://veritas-check.vercel.app/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
        body: JSON.stringify(emailPayload),
      });

      const resData = await formSubmitRes.json().catch(() => ({}));
      if (typeof resData?.message === "string") {
        relayMessage = resData.message;
        if (resData.message.toLowerCase().includes("activation") || resData.success === "false") {
          needsActivation = true;
        }
      }
    } catch (relayError) {
      console.warn("FormSubmit relay warning:", relayError);
    }

    // Direct mailto links for immediate 100% reliable fallback
    const mailtoSubject = encodeURIComponent(subject);
    const mailtoBody = encodeURIComponent(
      `Category: ${category}\nSentiment: ${sentiment}\nUser: ${email || "Anonymous"}\n\nMessage:\n${message}\n\nMetadata:\nURL: ${metadata?.url}\nViewport: ${metadata?.viewport}\nTime: ${new Date().toISOString()}`
    );

    const gmailWebLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${mailtoSubject}&body=${mailtoBody}`;
    const directMailto = `mailto:${recipient}?subject=${mailtoSubject}&body=${mailtoBody}`;

    return NextResponse.json({
      success: true,
      needsActivation,
      relayMessage,
      message: "Feedback submitted successfully.",
      mailtoBackup: directMailto,
      gmailLink: gmailWebLink,
    });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json(
      { error: "Failed to process feedback submission." },
      { status: 500 }
    );
  }
}
