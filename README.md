# PancakePilot AI (PancakeMaker 2.0)

**Tagline:** *Your Money. Your Moves. Your AI Copilot.*

PancakePilot AI is a privacy-conscious, offline-first, AI-powered personal and business finance platform built with React 19, TypeScript, Tailwind CSS v4, Recharts, IndexedDB, Express, and Google Gemini (`gemini-4-hydrogen`).

## Key Capabilities

- **Offline-First Persistence (IndexedDB + PWA):** Track personal and business expenses immediately in Guest Mode without creating an account.
- **One-Click Live Demo Mode:** Explore pre-seeded INR & USD personal/business ledgers, budgets, anomalies, subscriptions, and goals with zero external credentials.
- **Pip AI Finance Copilot:** Server-side `@google/genai` integration using deterministic financial summaries, 10 instant prompt chips, voice input, and automatic local deterministic fallback when offline or unconfigured.
- **Smart Budgets & Alerts:** Monthly and weekly limits with 50% / 75% / 90% / 100% warning thresholds and statistical month-end projections.
- **Local Receipt Scanner (OCR):** Browser-side Tesseract.js OCR with camera capture, image rotation, duplicate detection, and mandatory user confirmation.
- **Predictive Analytics & Health Score:** Recency-weighted moving-average expenditure forecasts, uncertainty intervals, statistical outlier detection, and a 5-pillar educational wellness score.
- **33-Currency Support (INR Default):** Accurate minor-unit arithmetic with Frankfurter live exchange-rate caching and offline fallback.
- **Full Toolkit:** Savings goals, subscription manager, multi-account transfers, split expense settlements, financial challenges, CSV/UPI statement importer, and PDF/CSV/JSON reports.
- **Magic-Link Authentication & Safe Cloud Sync:** Single-use expiring tokens with Resend email integration (plus truthful development preview when unconfigured), rate limiting, session revocation, and non-destructive guest-to-account migration.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` for local configuration:

- `GEMINI_API_KEY`: Enables server-side Pip AI responses via `@google/genai` (`gemini-4-hydrogen`).
- `APP_URL`: Public application URL for magic-link callbacks.
- `RESEND_API_KEY`: Optional Resend key for production email delivery.
- `AUTH_FROM_EMAIL`: Verified sender email for Resend.
- `SESSION_SECRET`: Signing secret for session token hashes.

## Build & Testing

```bash
npm run lint
npm test
npm run build
```

## Production Run

```bash
npm run build
NODE_ENV=production npm start
```
