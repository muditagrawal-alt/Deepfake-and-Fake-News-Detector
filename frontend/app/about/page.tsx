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
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:pt-16">
      <h1 className="text-4xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-3 text-ink-2 text-[17px] leading-relaxed max-w-[60ch]">
        Measured file facts, a model's reading of the content, and independent evidence from the web, with every source shown to you.
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
