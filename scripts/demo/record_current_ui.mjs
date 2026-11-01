/**
 * Records an ultra-smooth, high-clarity 720p demo of the current Landing Website and Workspace.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright");

const BASE = "http://localhost:3000";
const OUT = resolve("/tmp/veritas-ui-720p");
const SIZE = { width: 1280, height: 720 };
const CTX = {
  viewport: SIZE,
  deviceScaleFactor: 2, // High-DPI for razor-sharp typography and icons at 720p
  colorScheme: "dark",
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--font-render-hinting=medium", "--enable-font-antialiasing"],
});

const segments = [];

/**
 * Cinematic smooth scroll using cubic easing for maximum readability.
 */
async function glide(page, to, ms = 2400) {
  await page.evaluate(
    ([target, duration]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const start = performance.now();
        // Cubic ease-in-out
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          const t = Math.min((now - start) / duration, 1);
          window.scrollTo(0, from + (target - from) * ease(t));
          t < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [to, ms]
  );
}

async function record(name, fn) {
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    ...CTX,
    recordVideo: { dir, size: SIZE },
  });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    await ctx.close();
  }
  const videoFile = readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (videoFile) {
    const file = join(dir, videoFile);
    segments.push({ name, file });
    console.log(`[SUCCESS] Recorded segment: ${name}`);
  } else {
    console.warn(`[WARNING] No video file found for: ${name}`);
  }
}

// 1. Title card
await record("title", async (page) => {
  await page.goto("file://" + resolve("scripts/demo/title.html"));
  await page.waitForTimeout(3600);
});

// 2. Landing hero with Ferrofluid liquid dynamics
await record("landing_hero", async (page) => {
  await page.goto(BASE);
  await page.waitForTimeout(2000);

  // Smoothly move mouse across the Ferrofluid simulation canvas
  const waypoints = [
    [320, 360],
    [540, 420],
    [760, 340],
    [980, 400],
    [640, 360],
  ];
  for (const [x, y] of waypoints) {
    await page.mouse.move(x, y, { steps: 12 });
    await page.waitForTimeout(220);
  }

  // Smoothly glide down to the feature overview
  await glide(page, 620, 2400);
  await page.waitForTimeout(2200);
});

// 3. Landing live interactive forensic demo
await record("landing_forensics", async (page) => {
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  // Glide down directly to the interactive forensic section
  await glide(page, 1280, 2200);
  await page.waitForTimeout(1800);

  // Click on the interactive forensic tabs / buttons if available
  const tabButtons = await page.$$("button[role='tab'], button:has-text('Deepfake'), button:has-text('Image')");
  if (tabButtons.length > 1) {
    await tabButtons[1].click();
    await page.waitForTimeout(1600);
  }
  await glide(page, 1680, 1800);
  await page.waitForTimeout(2000);
});

// 4. Workspace: Ingress & URL entry showing quota
await record("workspace_ingress", async (page) => {
  await page.goto(`${BASE}/?demo=1&stage=workspace`);
  await page.waitForSelector("#url", { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Hover over the quota badge
  const quotaEl = page.locator("text=/\\d+ free check/i").first();
  if (await quotaEl.isVisible()) {
    await quotaEl.hover();
    await page.waitForTimeout(1000);
  }

  // Select sample link or fill URL
  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  await urlInput.click();
  await page.waitForTimeout(300);
  await urlInput.fill(sampleUrl);
  await page.waitForTimeout(2000);
});

// 5. Workspace: Running check with 5-stage progress indicator
await record("workspace_progress", async (page) => {
  await page.goto(`${BASE}/?demo=1&stage=workspace`);
  await page.waitForSelector("#url", { timeout: 15000 });

  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  await urlInput.fill(sampleUrl);
  await page.waitForTimeout(400);

  const runBtn = page.getByRole("button", { name: "Run check" });
  await runBtn.click();
  // Hold on the multi-stage progress animation
  await page.waitForTimeout(4500);
});

// 6. Workspace: Result card with verdict, signals & SHA-256 evidence fingerprint
await record("workspace_result", async (page) => {
  await page.goto(`${BASE}/?demo=1&stage=workspace`);
  await page.waitForSelector("#url", { timeout: 15000 });

  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  await urlInput.fill(sampleUrl);
  const runBtn = page.getByRole("button", { name: "Run check" });
  await runBtn.click();

  // Wait for the analysis verdict card to render
  await page.waitForSelector("section[aria-live]", { timeout: 25000 });
  await page.waitForTimeout(1200);

  // Scroll to reveal the complete result card
  await page.evaluate(() => {
    const el = document.querySelector("section[aria-live]");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  await page.waitForTimeout(4000);

  // Scroll further down to reveal corroborated claims, sources, and SHA-256 fingerprint
  await page.evaluate(() => window.scrollBy({ top: 360, behavior: "smooth" }));
  await page.waitForTimeout(4500);
});

// 7. Workspace: PDF Dossier Export & BYOK API Keys Dialog
await record("workspace_pdf_byok", async (page) => {
  await page.goto(`${BASE}/?demo=1&stage=workspace`);
  await page.waitForSelector("#url", { timeout: 15000 });

  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  await urlInput.fill(sampleUrl);
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForSelector("section[aria-live]", { timeout: 25000 });
  await page.waitForTimeout(1200);

  // Click Export PDF Dossier button
  const exportBtn = page.getByRole("button", { name: /Export PDF Dossier/i });
  if (await exportBtn.isVisible()) {
    await exportBtn.hover();
    await page.waitForTimeout(600);
    await exportBtn.click();
    await page.waitForTimeout(2500);
  }

  // Open BYOK Keys dialog
  const byokBtn = page.locator("button:has-text('Add key'), button[title*='Free detections']").first();
  if (await byokBtn.isVisible()) {
    await byokBtn.click();
    await page.waitForTimeout(3800);
  }
});

// 8. Closing card
await record("closing", async (page) => {
  await page.goto("file://" + resolve("scripts/demo/closing.html"));
  await page.waitForTimeout(4000);
});

writeFileSync(join(OUT, "segments.json"), JSON.stringify(segments, null, 2));
await browser.close();
console.log(`[DONE] All segments written to ${join(OUT, "segments.json")}`);
