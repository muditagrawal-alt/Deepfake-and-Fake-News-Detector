import { auth, enabledAuthProviders } from "@/auth";
import AppFlow from "@/components/AppFlow";

export default async function Home({ searchParams }: { searchParams: Promise<{ signedIn?: string; demo?: string; stage?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  let user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  } : null;

  if (!user && (params.demo === "1" || process.env.ENABLE_DEMO_USER === "true")) {
    user = {
      id: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
      name: "Forensic Analyst",
      email: "demo@veritas-forensics.internal",
      image: "",
    };
  }

  return <AppFlow user={user} providers={enabledAuthProviders} startInWorkspace={params.signedIn === "1" || params.stage === "workspace"} />;
}
