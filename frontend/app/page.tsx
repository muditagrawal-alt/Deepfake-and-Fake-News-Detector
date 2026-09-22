import Link from "next/link";
import Analyzer from "@/components/Analyzer";
import Intro from "@/components/Intro";

const STEPS: [string, string][] = [
  ["Extract", "Article text, sampled frames, the audio track and container metadata are pulled out locally."],
  ["Check", "Claims are searched against sources independent of the publisher. Pixels are scored by an AI-image detector."],
  ["Judge", "The model weighs every signal, states a confidence, and lists what it could not verify."],
];

export default function Home() {
  return (
    <>
      <Intro />

      <section id="check" className="relative z-10 border-t border-line bg-bg scroll-mt-14">
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-20">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Is it real?</h2>
          <p className="mt-3 max-w-2xl text-ink-2 text-[17px] leading-relaxed">
            Paste a news link, or upload an image or short video. Get a verdict, the claims checked, and the sources.
          </p>

          <div className="mt-8">
            <Analyzer />
          </div>

          <div className="mt-16 max-w-2xl">
            <h3 className="text-lg font-semibold tracking-tight">How a verdict is built</h3>
            <ol className="mt-4 space-y-5">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <span className="font-mono text-sm text-ink-3 pt-0.5 tabular-nums">{i + 1}</span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-sm text-ink-2 leading-relaxed max-w-[55ch]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-ink-2">
              <Link href="/about" className="underline decoration-line-strong underline-offset-2 hover:text-accent">Read the full method</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
