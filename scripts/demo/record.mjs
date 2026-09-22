/**
 * Records the demo segments. Each segment is a separate Playwright context so
 * it becomes its own video file; build.py then cuts, crossfades and captions.
 *
 * Run from the repository root:
 *   node scripts/demo/record.mjs <base-url> <out-dir>
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Playwright lives in the frontend workspace; resolve from there so this file
// can sit at the repo root. Run this script FROM the repo root.
const { chromium } = createRequire(resolve("frontend/package.json"))("playwright");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const OUT = resolve(process.argv[3] || "/tmp/veritas-demo");
const SIZE = { width: 1280, height: 720 };
// Dark mode: white film-style captions need dark footage to sit on.
const CTX = { viewport: SIZE, colorScheme: "dark", deviceScaleFactor: 1 };
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const segments = [];

/** Bring the verdict card fully into view, clear of the sticky header. */
async function revealResult(page) {
  await page.evaluate(() => {
    const el = document.querySelector("section[aria-live]");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "instant" });
  });
  await page.waitForTimeout(350);
}

async function record(name, fn) {
  const dir = join(OUT, name);
  const ctx = await browser.newContext({ ...CTX, recordVideo: { dir, size: SIZE } });
  const page = await ctx.newPage();
  try { await fn(page); } finally { await ctx.close(); }
  const file = join(dir, readdirSync(dir).find((f) => f.endsWith(".webm")));
  segments.push({ name, file });
  console.log(`recorded ${name}`);
}

// 1. Title card
await record("title", async (page) => {
  await page.goto("file://" + resolve("scripts/demo/title.html"));
  await page.waitForTimeout(4200);
});

// 2. Landing: the wordmark resolves, then the checker scrolls in
await record("landing", async (page) => {
  await page.goto(BASE);
  await page.waitForTimeout(2800);
  await page.getByRole("link", { name: "Run a check" }).click();
  await page.waitForTimeout(2200);
});

// 3. News check: type the URL, submit, then hold on the loading state
await record("news_start", async (page) => {
  await page.goto(BASE + "/#check");
  await page.waitForTimeout(700);
  await page.locator("#url").pressSequentially(
    "https://www.theonion.com/report-nation-somehow-more-divided-than-ever-before-1849972712", { delay: 22 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForTimeout(2600);           // skeleton only; the wait is cut out
});

// 4. News result: the finished verdict, claims and sources
await record("news_result", async (page) => {
  await page.goto(BASE + "/#check");
  await page.locator("#url").fill(
    "https://www.theonion.com/report-nation-somehow-more-divided-than-ever-before-1849972712");
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForSelector("text=Likely fake", { timeout: 180000 });
  await revealResult(page);
  await page.waitForTimeout(3600);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(3200);
});

// 5. Video check: upload, hold on the staged progress
await record("video_start", async (page) => {
  await page.goto(BASE + "/#check");
  await page.getByRole("tab", { name: "Video" }).click();
  await page.waitForTimeout(600);
  await page.setInputFiles("input[type=file]", resolve("data/evaluation/videos/fake/vid_fake_human_gemini_001.mp4"));
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForTimeout(3400);
});

// 6. Video result
await record("video_result", async (page) => {
  await page.goto(BASE + "/#check");
  await page.getByRole("tab", { name: "Video" }).click();
  await page.setInputFiles("input[type=file]", resolve("data/evaluation/videos/fake/vid_fake_human_gemini_001.mp4"));
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForSelector("text=/\\d+% confidence/", { timeout: 300000 });
  await revealResult(page);
  await page.waitForTimeout(3800);
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
  await page.waitForTimeout(3000);
});

writeFileSync(join(OUT, "segments.json"), JSON.stringify(segments, null, 2));
await browser.close();
console.log("segments ->", join(OUT, "segments.json"));
