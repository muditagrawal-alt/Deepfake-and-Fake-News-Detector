import { jsPDF } from "jspdf";
import type { AnalysisResult, HistoryEntry } from "@/lib/api";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 14;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 182mm
const CONTENT_BOTTOM = 278;

interface ThemeColors {
  primary: [number, number, number];
  accent: [number, number, number];
  ink: [number, number, number];
  body: [number, number, number];
  muted: [number, number, number];
  border: [number, number, number];
  cardBg: [number, number, number];
  realBg: [number, number, number];
  realText: [number, number, number];
  realBorder: [number, number, number];
  fakeBg: [number, number, number];
  fakeText: [number, number, number];
  fakeBorder: [number, number, number];
  uncertainBg: [number, number, number];
  uncertainText: [number, number, number];
  uncertainBorder: [number, number, number];
}

const COLORS: ThemeColors = {
  primary: [10, 15, 29], // #0A0F1D deep navy
  accent: [2, 132, 199], // #0284C7 sky blue
  ink: [15, 23, 42], // #0F172A slate-900
  body: [51, 65, 85], // #334155 slate-700
  muted: [100, 116, 139], // #64748B slate-500
  border: [226, 232, 240], // #E2E8F0 slate-200
  cardBg: [248, 250, 252], // #F8FAFC slate-50
  realBg: [220, 252, 231], // #DCFCE7 green-100
  realText: [21, 128, 61], // #15803D green-700
  realBorder: [74, 222, 128], // #4ADE80 green-400
  fakeBg: [254, 226, 226], // #FEE2E2 red-100
  fakeText: [185, 28, 28], // #B91C1C red-700
  fakeBorder: [248, 113, 113], // #F87171 red-400
  uncertainBg: [254, 243, 199], // #FEF3C7 amber-100
  uncertainText: [180, 83, 9], // #B45309 amber-700
  uncertainBorder: [251, 191, 36], // #FBBF24 amber-400
};

function drawHeader(doc: jsPDF, subtitle: string, dossierId: string) {
  // Top Banner
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_WIDTH, 23, "F");

  // Accent Line
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 23, PAGE_WIDTH, 1.2, "F");

  // Brand Logo & Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("VERITAS", MARGIN_LEFT, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(subtitle.toUpperCase(), MARGIN_LEFT, 17);

  // Metadata right-aligned
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(dossierId, PAGE_WIDTH - MARGIN_RIGHT, 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  doc.text(nowStr, PAGE_WIDTH - MARGIN_RIGHT, 17, { align: "right" });
}

function drawFooters(doc: jsPDF) {
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Rule line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 12);

    // Left metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("Veritas Evidence-Calibrated Forensic Verification · veritas-check.vercel.app", MARGIN_LEFT, PAGE_HEIGHT - 7);

    // Right pagination
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 7, { align: "right" });
  }
}

function getVerdictTheme(verdict: string) {
  if (verdict === "LIKELY_REAL" || verdict === "LIKELY REAL") {
    return {
      bg: COLORS.realBg,
      text: COLORS.realText,
      border: COLORS.realBorder,
      label: "LIKELY REAL",
    };
  }
  if (verdict === "LIKELY_FAKE" || verdict === "LIKELY FAKE") {
    return {
      bg: COLORS.fakeBg,
      text: COLORS.fakeText,
      border: COLORS.fakeBorder,
      label: "LIKELY FAKE",
    };
  }
  return {
    bg: COLORS.uncertainBg,
    text: COLORS.uncertainText,
    border: COLORS.uncertainBorder,
    label: "UNCERTAIN",
  };
}

/**
 * Clean multi-page history export
 */
export function exportHistoryPdf(history: HistoryEntry[], userName?: string): void {
  if (!history || !history.length) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const dossierId = `DOSSIER-HIST-${Date.now().toString(36).toUpperCase()}`;

  let y = 30;

  drawHeader(doc, "Multi-Modal Integrity Dossier · Audit Archive", dossierId);

  // Executive Overview Box
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, 26, 2, 2, "FD");

  // Title inside overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const userGreeting = userName ? `Archive for ${userName}` : "Audit Archive Summary";
  doc.text(userGreeting, MARGIN_LEFT + 4, y + 6);

  // Stats
  const total = history.length;
  const fakeCount = history.filter((h) => (h.verdict as string).includes("FAKE")).length;
  const realCount = history.filter((h) => (h.verdict as string).includes("REAL")).length;
  const uncertainCount = total - fakeCount - realCount;
  const avgConf = Math.round(
    (history.reduce((acc, h) => acc + (h.confidence || 0), 0) / (total || 1)) * 100
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.body);
  doc.text(`Total Audits: ${total} records`, MARGIN_LEFT + 4, y + 13);
  doc.text(`Average Evidentiary Confidence: ${avgConf}%`, MARGIN_LEFT + 4, y + 19);

  // Badge pills on the right side of overview
  const badgeY = y + 7;
  let badgeX = PAGE_WIDTH - MARGIN_RIGHT - 4;

  const badges = [
    { label: `${fakeCount} Synthetic / Fake`, colors: COLORS.fakeBg, text: COLORS.fakeText, border: COLORS.fakeBorder },
    { label: `${realCount} Corroborated Real`, colors: COLORS.realBg, text: COLORS.realText, border: COLORS.realBorder },
    { label: `${uncertainCount} Uncertain`, colors: COLORS.uncertainBg, text: COLORS.uncertainText, border: COLORS.uncertainBorder },
  ];

  for (let b = badges.length - 1; b >= 0; b--) {
    const item = badges[b];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const textWidth = doc.getTextWidth(item.label);
    const pillWidth = textWidth + 6;
    badgeX -= pillWidth;

    doc.setFillColor(...item.colors);
    doc.setDrawColor(...item.border);
    doc.roundedRect(badgeX, badgeY, pillWidth, 6, 1.5, 1.5, "FD");
    doc.setTextColor(...item.text);
    doc.text(item.label, badgeX + 3, badgeY + 4.2);
    badgeX -= 3;
  }

  y += 33;

  // Render Each Case Item
  history.forEach((entry, idx) => {
    // Check if we need a page break
    if (y + 48 > CONTENT_BOTTOM) {
      doc.addPage();
      y = 30;
      drawHeader(doc, "Multi-Modal Integrity Dossier · Audit Archive", dossierId);
    }

    const r = entry.result || ({} as AnalysisResult);
    const vTheme = getVerdictTheme(entry.verdict);
    const itemNum = String(idx + 1).padStart(2, "0");

    // Case Header Strip
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accent);
    doc.text(`CASE #${itemNum}`, MARGIN_LEFT, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const modalityTag = `[${(entry.modality || "MEDIA").toUpperCase()}]`;
    doc.text(modalityTag, MARGIN_LEFT + 18, y);

    const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "";
    if (dateStr) {
      doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });
    }

    y += 3;

    // Card boundary calculation
    const summaryLines = doc.splitTextToSize(entry.summary || r.summary || "No summary recorded.", USABLE_WIDTH - 12);
    const reasoningLines = r.reasoning
      ? doc.splitTextToSize(`Reasoning: ${r.reasoning}`, USABLE_WIDTH - 12)
      : [];
    const cardHeight = 22 + summaryLines.length * 3.8 + (reasoningLines.length ? reasoningLines.length * 3.6 + 3 : 0);

    // If card overflows page, add page before rendering card
    if (y + cardHeight > CONTENT_BOTTOM) {
      doc.addPage();
      y = 30;
      drawHeader(doc, "Multi-Modal Integrity Dossier · Audit Archive", dossierId);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.accent);
      doc.text(`CASE #${itemNum} (CONTINUED)`, MARGIN_LEFT, y);
      y += 4;
    }

    doc.setFillColor(...COLORS.cardBg);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, cardHeight, 2, 2, "FD");

    // Input Label / Title inside card
    const cardStartY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    const labelText = entry.input_label || "Audited Target Media";
    const truncatedLabel = labelText.length > 70 ? labelText.slice(0, 67) + "..." : labelText;
    doc.text(truncatedLabel, MARGIN_LEFT + 4, cardStartY + 6);

    // Verdict Badge inside card
    const confPct = Math.round((entry.confidence || r.confidence || 0) * 100);
    const verdictBadgeText = `${vTheme.label} (${confPct}%)`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const vBadgeWidth = doc.getTextWidth(verdictBadgeText) + 6;
    const vBadgeX = PAGE_WIDTH - MARGIN_RIGHT - 4 - vBadgeWidth;

    doc.setFillColor(...vTheme.bg);
    doc.setDrawColor(...vTheme.border);
    doc.roundedRect(vBadgeX, cardStartY + 2.5, vBadgeWidth, 5.5, 1.2, 1.2, "FD");
    doc.setTextColor(...vTheme.text);
    doc.text(verdictBadgeText, vBadgeX + 3, cardStartY + 6.3);

    // Summary Text
    let currentY = cardStartY + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.body);
    summaryLines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 4, currentY);
      currentY += 3.8;
    });

    // Reasoning Text (if present)
    if (reasoningLines.length) {
      currentY += 1;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      reasoningLines.slice(0, 4).forEach((line: string) => {
        doc.text(line, MARGIN_LEFT + 4, currentY);
        currentY += 3.6;
      });
    }

    y += cardHeight + 6;
  });

  drawFooters(doc);

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`veritas-audit-history-${fileDate}.pdf`);
}

/**
 * Detailed single case dossier PDF export
 */
export function exportSingleResultPdf(
  entry: HistoryEntry | { result: AnalysisResult; input_label: string; created_at?: string },
  userName?: string
): void {
  const r = entry.result;
  if (!r) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const dossierId = r.id || `VRT-${Date.now().toString(36).toUpperCase()}`;

  let y = 30;

  drawHeader(doc, "Forensic Verification & Provenance Dossier", dossierId);

  // Hero Section
  const vTheme = getVerdictTheme(r.verdict);
  const confPct = Math.round((r.confidence || 0) * 100);

  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, 34, 2, 2, "FD");

  // Subject title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.ink);
  const label = entry.input_label || (r.modality === "news" ? r.extraction?.url || "Audited Source" : "Media Artifact");
  const truncatedLabel = label.length > 75 ? label.slice(0, 72) + "..." : label;
  doc.text(truncatedLabel, MARGIN_LEFT + 5, y + 8);

  // Modality & Ingestion Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const modalityLabel = `MODALITY: ${(r.modality || "MEDIA").toUpperCase()} · AUDITED: ${new Date(r.created_at || Date.now()).toLocaleDateString()}`;
  doc.text(modalityLabel, MARGIN_LEFT + 5, y + 14);

  // Large Verdict Ribbon
  const verdictBannerText = `${vTheme.label} · ${confPct}% FORENSIC CONFIDENCE`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const bannerWidth = doc.getTextWidth(verdictBannerText) + 8;
  const bannerX = PAGE_WIDTH - MARGIN_RIGHT - 5 - bannerWidth;

  doc.setFillColor(...vTheme.bg);
  doc.setDrawColor(...vTheme.border);
  doc.roundedRect(bannerX, y + 4.5, bannerWidth, 8, 1.5, 1.5, "FD");
  doc.setTextColor(...vTheme.text);
  doc.text(verdictBannerText, bannerX + 4, y + 10);

  // Engine model provenance
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  const provText = `Evaluated via ${r.provenance?.model || "Veritas Multi-Modal Engine"} (${r.provenance?.provider || "Bayesian Consensus"})`;
  doc.text(provText, MARGIN_LEFT + 5, y + 23);

  if (userName) {
    doc.text(`Requested by: ${userName}`, MARGIN_LEFT + 5, y + 28);
  }

  y += 40;

  // Section 1: Executive Summary & Detailed Reasoning
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. EXECUTIVE SUMMARY & REASONING", MARGIN_LEFT, y);
  y += 4;

  const summaryLines = doc.splitTextToSize(r.summary || "No executive summary provided.", USABLE_WIDTH - 8);
  const reasoningLines = r.reasoning
    ? doc.splitTextToSize(r.reasoning, USABLE_WIDTH - 8)
    : [];

  const textBlockHeight = 12 + (summaryLines.length + reasoningLines.length) * 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, textBlockHeight, 1.5, 1.5, "FD");

  let textY = y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.ink);
  summaryLines.forEach((line: string) => {
    doc.text(line, MARGIN_LEFT + 4, textY);
    textY += 4;
  });

  if (reasoningLines.length) {
    textY += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.body);
    reasoningLines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 4, textY);
      textY += 4;
    });
  }

  y += textBlockHeight + 7;

  // Section 2: Evidentiary Claims Triangulation (if any)
  if (r.claims && r.claims.length > 0) {
    if (y + 35 > CONTENT_BOTTOM) {
      doc.addPage();
      y = 30;
      drawHeader(doc, "Forensic Verification & Provenance Dossier", dossierId);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("2. FACTUAL CLAIMS & CORROBORATING SOURCES", MARGIN_LEFT, y);
    y += 4;

    r.claims.forEach((claim, cIdx) => {
      const claimLines = doc.splitTextToSize(`Claim ${cIdx + 1}: ${claim.claim}`, USABLE_WIDTH - 38);
      const explLines = claim.explanation
        ? doc.splitTextToSize(claim.explanation, USABLE_WIDTH - 10)
        : [];
      const itemHeight = 10 + (claimLines.length + explLines.length) * 3.8 + (claim.sources?.length ? 6 : 0);

      if (y + itemHeight > CONTENT_BOTTOM) {
        doc.addPage();
        y = 30;
        drawHeader(doc, "Forensic Verification & Provenance Dossier", dossierId);
      }

      doc.setFillColor(...COLORS.cardBg);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, itemHeight, 1.5, 1.5, "FD");

      // Claim status pill
      const isCorrob = claim.status === "corroborated";
      const isContrad = claim.status === "contradicted";
      const pillBg = isCorrob ? COLORS.realBg : isContrad ? COLORS.fakeBg : COLORS.uncertainBg;
      const pillText = isCorrob ? COLORS.realText : isContrad ? COLORS.fakeText : COLORS.uncertainText;
      const pillBorder = isCorrob ? COLORS.realBorder : isContrad ? COLORS.fakeBorder : COLORS.uncertainBorder;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const statusLabel = (claim.status || "UNVERIFIABLE").toUpperCase();
      const pillWidth = doc.getTextWidth(statusLabel) + 5;
      const pillX = PAGE_WIDTH - MARGIN_RIGHT - 4 - pillWidth;

      doc.setFillColor(...pillBg);
      doc.setDrawColor(...pillBorder);
      doc.roundedRect(pillX, y + 2.5, pillWidth, 5, 1, 1, "FD");
      doc.setTextColor(...pillText);
      doc.text(statusLabel, pillX + 2.5, y + 5.8);

      // Claim text
      let claimY = y + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.ink);
      claimLines.forEach((cl: string) => {
        doc.text(cl, MARGIN_LEFT + 4, claimY);
        claimY += 3.8;
      });

      // Explanation
      if (explLines.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.body);
        explLines.forEach((el: string) => {
          doc.text(el, MARGIN_LEFT + 4, claimY);
          claimY += 3.8;
        });
      }

      // Sources
      if (claim.sources && claim.sources.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.accent);
        const sourceTitles = claim.sources.map((s) => s.title || s.url).join(" · ");
        const truncatedSources = sourceTitles.length > 95 ? sourceTitles.slice(0, 92) + "..." : sourceTitles;
        doc.text(`Sources: ${truncatedSources}`, MARGIN_LEFT + 4, claimY + 1);
      }

      y += itemHeight + 3.5;
    });

    y += 4;
  }

  // Section 3: Sensor Forensics & Watermarks (if any)
  if (r.signals && r.signals.length > 0) {
    if (y + 30 > CONTENT_BOTTOM) {
      doc.addPage();
      y = 30;
      drawHeader(doc, "Forensic Verification & Provenance Dossier", dossierId);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("3. MEASURED FORENSIC SENSORS & SIGNATURES", MARGIN_LEFT, y);
    y += 4;

    r.signals.forEach((sig) => {
      if (y + 12 > CONTENT_BOTTOM) {
        doc.addPage();
        y = 30;
        drawHeader(doc, "Forensic Verification & Provenance Dossier", dossierId);
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(MARGIN_LEFT, y, USABLE_WIDTH, 11, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.ink);
      doc.text(sig.name, MARGIN_LEFT + 4, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.body);
      const note = sig.note || sig.value || "";
      const truncatedNote = note.length > 80 ? note.slice(0, 77) + "..." : note;
      doc.text(truncatedNote, MARGIN_LEFT + 4, y + 9);

      // Direction indicator
      const isFake = sig.direction === "fake";
      const isReal = sig.direction === "real";
      const dirColor = isFake ? COLORS.fakeText : isReal ? COLORS.realText : COLORS.muted;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...dirColor);
      const dirText = `${(sig.weight || "MODERATE").toUpperCase()} · ${(sig.direction || "SIGNAL").toUpperCase()}`;
      doc.text(dirText, PAGE_WIDTH - MARGIN_RIGHT - 4, y + 7, { align: "right" });

      y += 13;
    });
  }

  drawFooters(doc);

  const cleanLabel = (entry.input_label || "dossier").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  doc.save(`veritas-${cleanLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
