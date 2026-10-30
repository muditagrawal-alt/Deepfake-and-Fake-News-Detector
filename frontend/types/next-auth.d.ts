import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; authTime: number } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    veritasAuthTime?: number;
  }
}
