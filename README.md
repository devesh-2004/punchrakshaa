# PunchRaksha — Ayurvedic E-Commerce Platform

PunchRaksha is a full-stack **Next.js 14 (App Router)** e-commerce platform selling Ayurvedic wellness products. It serves both the storefront (server-rendered React) and the backend (API route handlers) from a single codebase, backed by **PostgreSQL**, with images on **Cloudflare R2**, payments via **Razorpay**, shipping via **Shiprocket**, and phone-OTP authentication.

> **Live site:** https://www.punchraksha.com
> **Hosting:** AWS Amplify (CloudFront CDN)

> ⚠️ **Documentation accuracy note (read this first):**
> An older version of this README described a **MongoDB + Mongoose + Firebase-only** stack. That is **out of date.** The project was migrated to **PostgreSQL** (via the `pg` driver and a repository layer) and **Cloudflare R2** for images. Where any doc and the code disagree, **the code is authoritative.** See [docs/TECHNICAL-HANDOVER.md](docs/TECHNICAL-HANDOVER.md) for the full, code-derived reference.

---

## What this project does

A complete direct-to-consumer online store:

- **Storefront:** catalogue, product pages, blog/CMS, dynamic landing pages, reviews, policy pages.
- **Shopping:** cart (multiple pack options per product), coupons, wishlist.
- **Checkout:** address management, Razorpay online payments, Cash-on-Delivery.
- **Accounts:** phone-OTP customer login, order history, saved addresses, dashboard.
- **Fulfilment:** automated Shiprocket shipment creation, AWB assignment, tracking, invoices.
- **Admin back-office:** product/blog/content CRUD, order pipeline, review moderation, coupons, testimonials, inventory, settings, operational logs.

---

## Technology Stack (as implemented)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5 |
| Styling | Tailwind CSS 3, Lucide icons |
| Client state | Zustand (cart persisted to `localStorage` as `punchraksha-cart`) |
| Database | **PostgreSQL** via `pg` (node-postgres) + repository pattern (no ORM) |
| Image storage | **Cloudflare R2** (S3-compatible via `@aws-sdk/client-s3`) |
| Customer auth | **Firebase Phone OTP** (client) → `/api/auth/firebase-verify` → JWT cookie *(active path)* |
| Customer auth (alt) | **MSG91 OTP** routes exist server-side but are **not wired to any UI** (see handover doc) |
| Admin auth | Email + password (env vars) → JWT cookie |
| Payments | Razorpay |
| Logistics | Shiprocket API v2 |
| Validation | Zod |
| Hosting | AWS Amplify |

> **Legacy/active nuance:** the `firebase` / `firebase-admin` packages are **active** (they power the live login UI), while the MSG91 OTP API routes are present but unused by the front-end. This is the reverse of what `CLAUDE.md` states.

---

## Quick Start (local development)

```bash
# 1. Database
createdb punchraksha
npx tsx scripts/apply-schema.ts        # creates all tables (idempotent)

# 2. Environment — create .env in the project root (see Environment Variables below)
#    .env is gitignored. Secrets must be supplied privately, never committed.

# 3. Install & run
npm install
npm run dev                            # http://localhost:3000
```

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npx tsx scripts/apply-schema.ts` | Apply/upgrade the PostgreSQL schema |
| `npx tsx scripts/seed-admin.ts --phone <num> --email <e> --name <n>` | Register a database admin |

---

## Project Structure (top level)

```
app/            Next.js pages + API route handlers (the backend lives in app/api)
components/     React UI (admin, checkout, home, layout, product, ui, providers)
lib/            Logic & infrastructure (auth, db, repositories, integrations, utils)
scripts/        schema.sql, migrations/, seed & maintenance scripts (run with tsx)
middleware.ts   Edge route protection for /account, /dashboard, /admin
next.config.mjs Next.js config (whitelists Cloudflare R2 image hosts)
docs/           Full technical documentation
```

A complete folder/file breakdown is in [docs/TECHNICAL-HANDOVER.md](docs/TECHNICAL-HANDOVER.md).

---

## Environment Variables (summary)

Configured in `.env` (scripts also read `.env.local`). `.env` is **gitignored** — never commit it. Full table with per-file usage is in the handover doc.

| Variable | Purpose | Mandatory |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** |
| `NEXT_PUBLIC_JWT_SECRET` (or `JWT_SECRET`) | Signs the session JWT | **Yes** |
| `NEXT_PUBLIC_ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin login credentials | **Yes** |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config for phone OTP (active login) | **Yes (current auth)** |
| Firebase Admin service account | Server-side token verification in `firebase-verify` | **Yes (current auth)** |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | MSG91 OTP (routes present, UI-unused) | Optional today |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `..._SECRET` (or `RAZORPAY_KEY_SECRET`) | Razorpay payments | **Yes** |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` | Cloudflare R2 image storage | **Yes** |
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_PICKUP_LOCATION` | Shiprocket shipping | **Yes** for fulfilment |
| `SHIPROCKET_CHECKOUT_API_KEY` / `..._SECRET` | Shiprocket checkout APIs | Optional |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` | Public URLs (SEO, redirects) | Recommended |
| `NEXT_PUBLIC_NODE_ENV` | Gate for the dev-login bypass | Dev only |

> 🔒 **Security smell (documented, not fixed):** several secrets use the `NEXT_PUBLIC_` prefix (JWT secret, admin password, Razorpay secret), which exposes them to the browser bundle. Move these to server-only variables when touching auth/payments.

---

## Deployment (AWS Amplify)

- Pushing to the connected Git branch triggers an Amplify build (`npm run build`) and deploy behind CloudFront.
- **Critical:** CloudFront must forward the `punchraksha_token` cookie to the origin, or the auth middleware will redirect on every prefetch.
- `middleware.ts` protects `/account`, `/dashboard`, `/admin`, and `/api/admin`.

---

## Documentation

- **[docs/TECHNICAL-HANDOVER.md](docs/TECHNICAL-HANDOVER.md)** — exhaustive, code-derived: every folder/file, request lifecycle, auth/authz, DB schema + ER diagram, full API reference, env-var table, integrations, unused-code inventory, debugging, onboarding, production deployment.
- **[docs/PunchRaksha-Architecture-Documentation.md](docs/PunchRaksha-Architecture-Documentation.md)** — client-facing architecture overview.
- **[docs/PunchRaksha-Database-Migration-Report.md](docs/PunchRaksha-Database-Migration-Report.md)** — MongoDB → PostgreSQL migration report.
- **`CLAUDE.md`** — contributor guide. *(Note: its claim that MSG91 is the active auth path is contradicted by the code — Firebase OTP is what the UI uses.)*
# punchrakshaa
