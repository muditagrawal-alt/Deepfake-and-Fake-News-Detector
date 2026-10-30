import { createHmac } from "node:crypto";
import { auth } from "@/auth";

function encode(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (!serialized) throw new Error("Could not encode API token claims.");
  return Buffer.from(serialized).toString("base64url");
}

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return Response.json({ error: "unauthorized", message: "Sign in to continue." }, { status: 401 });
  }

  const secret = process.env.BACKEND_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return Response.json({ error: "configuration", message: "Backend token signing is not configured." }, { status: 503 });
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    iss: "veritas-web",
    aud: "veritas-api",
    sub: user.id,
    auth_iat: user.authTime,
    email: user.email,
    name: user.name || "Veritas user",
    // Some providers return a base64 avatar; keep the API bearer token small.
    picture: "",
    iat: now,
    exp: now + 300,
  });
  const content = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(content).digest("base64url");
  return Response.json({ token: `${content}.${signature}`, expires_in: 300 }, {
    headers: { "Cache-Control": "no-store, private" },
  });
}
