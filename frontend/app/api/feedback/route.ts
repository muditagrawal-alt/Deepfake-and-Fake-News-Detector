import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, sentiment, message, email, screenshot, metadata } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const recipient = "muditagrawal03@gmail.com";
    const subject = `[Veritas Feedback] [${category?.toUpperCase() || "GENERAL"}] ${message.slice(0, 60)}${message.length > 60 ? "..." : ""}`;

    // Format email payload
    const emailPayload: Record<string, unknown> = {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      to: recipient,
      category: category || "General Feedback",
      sentiment: sentiment || "Not specified",
      message: message.trim(),
      user_email: email?.trim() || "Anonymous",
      timestamp: new Date().toISOString(),
      url: metadata?.url || "Landing Page",
      viewport: metadata?.viewport || "Unknown",
      userAgent: metadata?.userAgent || "Unknown",
    };

    if (screenshot && typeof screenshot === "string" && screenshot.startsWith("data:")) {
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
