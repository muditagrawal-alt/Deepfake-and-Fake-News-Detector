# Veritas frontend

This Next.js app provides the animated intro, OAuth sign-in, private workspace,
three-use account quota, history and encrypted bring-your-own-key flow.

For full setup, OAuth callbacks, production database requirements and deployment
notes, follow the repository [Quick start](../README.md#quick-start).

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure at least one OAuth provider, `AUTH_SECRET`, `NEXT_PUBLIC_API_URL`, and
the same `BACKEND_TOKEN_SECRET` as the backend. Provider buttons stay disabled
until their client ID and secret are present.
