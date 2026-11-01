/**
 * Records full end-to-end production demo segments using Playwright.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright");

const BASE = "http://localhost:3000";
const OUT = resolve("/tmp/veritas-full-demo");
const SIZE = { width: 1280, height: 720 };
const CTX = {
  viewport: SIZE,
  colorScheme: "dark",
  deviceScaleFactor: 1,
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const segments = [];

async function glide(page, to, ms = 2200) {
  await page.evaluate(
    ([target, duration]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const start = performance.now();
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
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
  await page.waitForTimeout(4000);
});

// 2. Landing hero & Ferrofluid & interactive forensic demo
await record("landing", async (page) => {
  await page.goto(BASE);
  await page.waitForTimeout(2000);
  // Interact with ferrofluid physics by moving mouse
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(300 + i * 150, 400 + (i % 2) * 50);
    await page.waitForTimeout(250);
  }
  // Glide down to live interactive forensic demos
  await glide(page, 720, 2400);
  await page.waitForTimeout(1600);
  await glide(page, 1350, 2200);
  await page.waitForTimeout(1800);
});

// 3. Workspace: News check submission and progress
await record("workspace_news", async (page) => {
  await page.goto(`${BASE}/?stage=workspace`);
  await page.waitForTimeout(1500);

  // Fill in sample news article
  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  if (await urlInput.isVisible()) {
    await urlInput.fill(sampleUrl);
    await page.waitForTimeout(600);
    const runBtn = page.getByRole("button", { name: "Run check" });
    if (await runBtn.isVisible()) {
      await runBtn.click();
      // Hold on the multi-stage progress animation
      await page.waitForTimeout(3000);
    }
  }
});

// 4. Workspace: Result card with verdict, signals & SHA-256 evidence fingerprint
await record("workspace_result", async (page) => {
  await page.goto(`${BASE}/?stage=workspace`);
  await page.waitForTimeout(1200);

  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  if (await urlInput.isVisible()) {
    await urlInput.fill(sampleUrl);
    const runBtn = page.getByRole("button", { name: "Run check" });
    await runBtn.click();
    // Wait for the analysis verdict card
    await page.waitForSelector("section[aria-live], text=/confidence/i", { timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Scroll to reveal the complete result card
    await page.evaluate(() => {
      const el = document.querySelector("section[aria-live]");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    await page.waitForTimeout(3200);

    // Scroll further down to show corroborated claims & SHA-256 fingerprint
    await page.evaluate(() => window.scrollBy({ top: 380, behavior: "smooth" }));
    await page.waitForTimeout(3500);
  }
});

// 5. PDF Dossier export and BYOK key modal
await record("workspace_export_byok", async (page) => {
  await page.goto(`${BASE}/?stage=workspace`);
  await page.waitForTimeout(1200);

  // Trigger sample check to have a result ready
  const sampleUrl = "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets";
  const urlInput = page.locator("#url");
  if (await urlInput.isVisible()) {
    await urlInput.fill(sampleUrl);
    await page.getByRole("button", { name: "Run check" }).click();
    await page.waitForSelector("section[aria-live], text=/confidence/i", { timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Click Export PDF Dossier button
    const exportBtn = page.getByRole("button", { name: /Export PDF Dossier/i });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // Open BYOK Keys dialog
  const byokBtn = page.locator("button:has-text('Add key'), button[title*='Free detections']").first();
  if (await byokBtn.isVisible()) {
    await byokBtn.click();
    await page.waitForTimeout(3000);
  }
});

// 6. Architecture & System Topology
await record("architecture", async (page) => {
  await page.goto(`${BASE}/architecture`);
  await page.waitForTimeout(2200);
  await glide(page, 480, 2000);
  await page.waitForTimeout(2000);
  await glide(page, 950, 2000);
  await page.waitForTimeout(1800);
});

// 7. Tech Stack Showcase
await record("tech_stack", async (page) => {
  await page.goto(`${BASE}/tech-stack`);
  await page.waitForTimeout(2000);
  await glide(page, 550, 2000);
  await page.waitForTimeout(2000);
  await glide(page, 1100, 2000);
  await page.waitForTimeout(1800);
});

writeFileSync(join(OUT, "segments.json"), JSON.stringify(segments, null, 2));
await browser.close();
console.log(`[DONE] All segments written to ${join(OUT, "segments.json")}`);
