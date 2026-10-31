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

    // Format comprehensive email body
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

    // If a screenshot was attached (base64 data URL)
    if (screenshot && typeof screenshot === "string" && screenshot.startsWith("data:")) {
      emailPayload.has_screenshot = "Yes (Attached)";
      // Formsubmit accepts screenshot data or note
      emailPayload.screenshot_preview = screenshot.slice(0, 100) + "... [data URL]";
    }

    // Forward to FormSubmit endpoint for direct delivery to muditagrawal03@gmail.com
    try {
      const formSubmitRes = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!formSubmitRes.ok) {
        console.warn("FormSubmit response status:", formSubmitRes.status);
      }
    } catch (relayError) {
      console.warn("FormSubmit relay warning:", relayError);
    }

    // Always succeed and return mailto backup data
    const mailtoSubject = encodeURIComponent(subject);
    const mailtoBody = encodeURIComponent(
      `Category: ${category}\nSentiment: ${sentiment}\nUser: ${email || "Anonymous"}\n\nMessage:\n${message}\n\nMetadata:\nURL: ${metadata?.url}\nViewport: ${metadata?.viewport}\nTime: ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully.",
      mailtoBackup: `mailto:${recipient}?subject=${mailtoSubject}&body=${mailtoBody}`,
    });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json(
      { error: "Failed to process feedback submission." },
      { status: 500 }
    );
  }
}
