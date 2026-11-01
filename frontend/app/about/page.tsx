import Link from "next/link";

export const metadata = { title: "How it works: Veritas" };

const METHOD: [string, string][] = [
  ["Three steps", "Every check runs the same way. First the model reads the content and reports what it claims and what it shows, without giving a verdict. Then a web search, run by the server rather than the model, looks for independent evidence, leaving out the original publisher. Finally the model weighs the content, the file facts and that evidence, and gives a verdict with its reasons. No hand-written rule changes the verdict."],
  ["News link", "The article text is extracted with trafilatura. The model identifies the genre and pulls out two to four checkable claims, and each claim is marked corroborated, contradicted, misleading or unverifiable against the pages the search actually returned. A source the search did not return cannot be cited."],
  ["Image", "The file's EXIF, XMP and C2PA content credentials are read and passed on as facts, without interpretation. C2PA credentials are cryptographically signed, so when a generator such as Google or OpenAI has signed an image as AI-made, that is verifiable. The model describes the image, notes anything inconsistent with a real photograph, and checks any public figure, event or caption against the search results."],
  ["Video", "ffprobe and C2PA facts are read the same way. The model watches the clip with its audio, or reads frames and a transcript when it runs locally, and looks at motion, lip sync, on-screen text and what is said. Spoken claims are checked like an article's."],
];

export default function About() {
  return (
    <article className="about-page mx-auto max-w-[1120px] px-4 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-accent">
        <span aria-hidden>←</span> Veritas
      </Link>
      <header className="mt-10 max-w-[760px]">
        <p className="about-eyebrow">Technical method</p>
        <h1 className="mt-4 text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.055em]">How each review is built.</h1>
        <p className="mt-5 max-w-[64ch] text-base leading-7 text-ink-2 sm:text-lg">
          Veritas combines measured file details, a model&apos;s reading of the material and independent evidence from the web. Sources and limitations stay visible alongside the assessment.
        </p>
      </header>

      <div className="about-method-list mt-12 border-t border-line">
        {METHOD.map(([title, body], index) => (
          <section key={title} className="about-method-row grid gap-3 border-b border-line py-6 sm:grid-cols-[56px_180px_1fr] sm:gap-6 sm:py-8">
            <span className="font-mono text-xs tabular-nums text-ink-3">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="max-w-[72ch] text-sm leading-7 text-ink-2">{body}</p>
          </section>
        ))}
      </div>

      <aside className="about-limit mt-8 max-w-[850px] border-l-2 border-accent px-5 py-1">
        <h2 className="text-sm font-semibold">What a result can and cannot tell you</h2>
        <p className="mt-2 text-sm leading-6 text-ink-2">A model can miss manipulation, repeat false information or overstate confidence. A result is an estimate to review with its evidence—not proof that media is genuine or fabricated.</p>
      </aside>

      <p className="mt-10">
        <Link href="/#check" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:opacity-90">Open the review workspace <span aria-hidden>↗</span></Link>
      </p>
    </article>
  );
}
