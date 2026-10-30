import { createHash } from "node:crypto";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

const configuredProviders: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  configuredProviders.push(Google({
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email_verified ? profile.email : null,
        image: profile.picture,
      };
    },
  }));
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  configuredProviders.push(GitHub({
    authorization: { params: { scope: "read:user user:email" } },
    userinfo: {
      url: "https://api.github.com/user",
      async request({ tokens }: { tokens: { access_token?: string } }) {
        if (!tokens.access_token) throw new Error("GitHub did not return an access token.");
        const headers = { Authorization: `Bearer ${tokens.access_token}`, "User-Agent": "veritas" };
        const [profileResponse, emailsResponse] = await Promise.all([
          fetch("https://api.github.com/user", { headers }),
          fetch("https://api.github.com/user/emails?per_page=100", { headers }),
        ]);
        if (!profileResponse.ok || !emailsResponse.ok) throw new Error("Could not read the verified GitHub profile email.");
        const [profile, emails] = await Promise.all([profileResponse.json(), emailsResponse.json()]);
        const verified = (emails as { email: string; primary: boolean; verified: boolean }[]).filter((entry) => entry.verified);
        const email = verified.find((entry) => entry.primary)?.email || verified[0]?.email || null;
        return { ...profile, email };
      },
    },
  }));
}
export const enabledAuthProviders = [
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [{ id: "github", name: "GitHub" }] : []),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [{ id: "google", name: "Google" }] : []),
];

function accountId(identity: string): string {
  return createHash("sha256").update(identity).digest("hex");
}

export const { handlers, auth } = NextAuth({
  providers: configuredProviders,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    signIn({ user }) {
      return typeof user.email === "string" && user.email.includes("@");
    },
    jwt({ token, account, user }) {
      if (account?.provider && account.providerAccountId) {
        // Both configured providers only enter this path with a verified email address.
        const identity = user?.email
          ? `verified-email:${user.email.trim().toLowerCase()}`
          : `${account.provider}:${account.providerAccountId}`;
        token.sub = accountId(identity);
        token.veritasAuthTime = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.authTime = typeof token.veritasAuthTime === "number"
          ? token.veritasAuthTime
          : typeof token.iat === "number" ? token.iat * 1000 : Date.now();
      }
      return session;
    },
  },
});
