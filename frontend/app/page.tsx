import { auth, enabledAuthProviders } from "@/auth";
import AppFlow from "@/components/AppFlow";

export default async function Home({ searchParams }: { searchParams: Promise<{ signedIn?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  } : null;

  return <AppFlow user={user} providers={enabledAuthProviders} startInWorkspace={params.signedIn === "1"} />;
}
