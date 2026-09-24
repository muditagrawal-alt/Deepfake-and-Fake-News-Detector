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
// Any rendered verdict card, whatever the model concluded.
const VERDICT = "text=/\\d+% confidence/";
// Dark mode: white film-style captions need dark footage to sit on.
const CTX = { viewport: SIZE, colorScheme: "dark", deviceScaleFactor: 1 };
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const segments = [];

/**
 * Scroll at a controlled, cinematic pace. The browser's own smooth scroll is
 * too fast to read on video, and a jump would hide the intro handoff entirely.
 */
async function glide(page, to, ms = 2600) {
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
    [to, ms],
  );
}

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

// 2. Landing: the wordmark resolves out of noise, then scrolling carries the
//    whole block away as the checker rises over it.
await record("landing", async (page) => {
  await page.goto(BASE);
  await page.waitForTimeout(2600);
  await glide(page, await page.evaluate(() => Math.round(window.innerHeight * 0.92)), 3000);
  await page.waitForTimeout(900);
});

// 3. News check: type the URL, submit, then hold on the loading state
await record("news_start", async (page) => {
  await page.goto(BASE + "/#check");
  await page.waitForTimeout(700);
  await page.locator("#url").pressSequentially(
    "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets",
    { delay: 14 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForTimeout(2600);           // skeleton only; the wait is cut out
});

// 4. News result: the finished verdict, claims and sources
await record("news_result", async (page) => {
  await page.goto(BASE + "/#check");
  await page.locator("#url").fill(
    "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets");
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForSelector(VERDICT, { timeout: 420000 });
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

// The previous segment leaves a job still running on the backend. Against a
// small instance, submitting a second video immediately makes both crawl, so
// give the first one time to finish.
await new Promise((r) => setTimeout(r, 45000));

// 6. Video result
await record("video_result", async (page) => {
  await page.goto(BASE + "/#check");
  await page.getByRole("tab", { name: "Video" }).click();
  await page.setInputFiles("input[type=file]", resolve("data/evaluation/videos/fake/vid_fake_human_gemini_001.mp4"));
  await page.getByRole("button", { name: "Run check" }).click();
  await page.waitForSelector(VERDICT, { timeout: 420000 });
  await revealResult(page);
  await page.waitForTimeout(3800);
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
  await page.waitForTimeout(3000);
});

writeFileSync(join(OUT, "segments.json"), JSON.stringify(segments, null, 2));
await browser.close();
console.log("segments ->", join(OUT, "segments.json"));
