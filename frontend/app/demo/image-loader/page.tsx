import ImageGenerationLoaderDemo from "@/components/image-generation-loader-demo";

export const metadata = {
  title: "Image Generation Loader Demo - Veritas",
  description: "Aceternity UI Image Generation Loader demonstration.",
};

export default function ImageLoaderDemoPage() {
  return (
    <main className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      <ImageGenerationLoaderDemo />
    </main>
  );
}

