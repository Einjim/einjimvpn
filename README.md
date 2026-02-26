# VLESS Subscription Converter

A Next.js app that fetches xray JSON configs and converts them to standard `vless://` and `trojan://` subscription URIs.

## Deploy on Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Click **Deploy** (no env vars needed)

Your subscription URL will be:
```
https://YOUR-PROJECT.vercel.app/api/sub
```

## Local Development

```bash
npm install
npm run dev
```

Then visit `http://localhost:3000/api/sub` to see the subscription output.

## How it works

- `GET /api/sub` — fetches the source xray JSON, extracts all VLESS and Trojan outbounds, converts each to a standard URI, and returns them as a base64-encoded subscription (V2Ray/Xray/Nekoray/Hiddify compatible).
- Results are cached for 5 minutes via Next.js fetch cache.
