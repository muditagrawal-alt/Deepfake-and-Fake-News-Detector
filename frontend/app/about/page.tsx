import Link from "next/link";

export const metadata = { title: "How it works: Veritas" };

const METHOD: [string, string][] = [
  ["News link", "The article text is extracted with trafilatura. Gemini classifies the genre (hard news, satire, opinion, press release) and pulls out two to four checkable claims. Independent coverage is found with a web search that excludes the original publisher, the top pages are read, and each claim is marked corroborated, contradicted, misleading or unverifiable with the sources that were actually found."],
  ["Image", "EXIF, PNG text chunks and C2PA markers are read for camera or generator fingerprints. Gemini then describes the image, transcribes on-screen text and looks for generation artifacts. A pixel-level classifier can be enabled as well, but it is off by default: measured against our benchmark it lowered accuracy, over-calling real photographs of people as fake. If it shows a public figure or event, real coverage is searched and compared."],
  ["Video", "ffprobe reads container metadata: Gemini/Veo, InVideo and other generators leave fingerprints, and YouTube re-encodes are told apart from them. The clip is sent to Gemini, which watches it with audio: motion, lip sync, on-screen text and what is said. Spoken claims are fact-checked like an article."],
];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:pt-16">
      <h1 className="text-4xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-3 text-ink-2 text-[17px] leading-relaxed max-w-[60ch]">
        Lightweight forensics on a small backend, reasoning and fact-checking by a hosted model, and every source shown to you.
      </p>

      <div className="mt-12 space-y-10">
        {METHOD.map(([title, body]) => (
          <section key={title} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-ink-2 leading-relaxed">{body}</p>
          </section>
        ))}
      </div>

      <p className="mt-14 text-sm text-ink-2">
        <Link href="/#check" className="underline decoration-line-strong underline-offset-2 hover:text-accent">Back to the checker</Link>
      </p>
    </div>
  );
}
