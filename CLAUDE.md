# PunchRaksha — Claude Code Guide

## Project Overview

PunchRaksha is a **Next.js 14 (App Router)** full-stack e-commerce platform selling Ayurvedic products (primarily piles/hemorrhoid relief). It is deployed on **AWS Amplify** and uses **PostgreSQL** as its database. The live domain is `https://www.punchraksha.com`.

> **Note on history:** This project was migrated from MongoDB/Mongoose → PostgreSQL and from Firebase Storage → Cloudflare R2. Some legacy Firebase files still exist under `lib/firebase/` and `/api/auth/firebase-verify`, but the active stack is Postgres + R2 + MSG91 OTP. Trust the code over any older references.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| UI Icons | Lucide React |
| State Management | Zustand (persisted via `localStorage` as `punchraksha-cart`) |
| Database | PostgreSQL via `pg` (node-postgres), repository pattern in `lib/repositories/` |
| Image Storage | Cloudflare R2 (S3-compatible), via `lib/r2/client.ts` |
| Auth (Customers) | MSG91 Phone OTP → JWT cookie (`punchraksha_token`) |
| Auth (Admin) | Email/password → JWT cookie (`punchraksha_token`) |
| Payments | Razorpay |
| Logistics | Shiprocket API v2 |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Validation | Zod |
| Fonts | Outfit + REM (Google Fonts) |

## Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
```

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  (store routes)        # /, /product/[slug], /products, /blog, etc.
  admin/                # Protected admin pages (products, orders, blogs, content)
  admin-login/          # Admin auth page
  api/                  # Server-side API routes
    admin/              # Admin CRUD endpoints (auth-guarded)
    otp/                # MSG91 OTP: send, verify, resend (customer login)
    auth/               # logout, shiprocket login, legacy firebase-verify, dev-login
    create-order/       # Razorpay order creation
    verify-payment/     # Razorpay payment verification
    shiprocket/         # Shipping operations
    orders/             # Customer order endpoints
    reviews/            # Product reviews
    apply-coupon/       # Coupon validation
  dashboard/            # Customer account dashboard (orders, addresses)

components/
  admin/                # ProductForm, BlogForm, ContentForm + SortableImage
  checkout/             # AddressForm, OrderSummary, PaymentSection
  home/                 # HeroSection, BestSellingProducts, ProductSlider, etc.
  layout/               # Navbar, Footer, AnnouncementBar, CartDrawer
    cart-drawer/        # Cart sub-components: AuthModal, AddressList, etc.
  product/              # ProductHero, ProductTabs, CustomerReviews, etc.
  providers/            # ShiprocketProvider (currently commented out in layout)
  ui/                   # Atomic components: Button, Badge, ProductCard, etc.

lib/
  auth.ts               # JWT sign/verify, cookie helpers
  db/postgres.ts        # Singleton pg Pool + query/rows/one/withTransaction helpers
  repositories/         # Data-access layer (one file per entity) — see Database below
    _mappers.ts         # Shared row→doc mapping helpers (num, date, sortClause)
    product.repository.ts, order.repository.ts, user.repository.ts, etc.
  r2/client.ts          # Cloudflare R2 upload helpers (uploadToR2, buildKey, isAllowedImage)
  firebase/             # LEGACY (migrated away) — client.ts / admin.ts, kept for old flows
  razorpay.ts           # Razorpay client init
  shiprocket/
    auth.ts             # Shiprocket token management
    shiprocketService.ts # ShiprocketService class (createAdhocOrder, assignAWB, etc.)
  cart/
    cartStore.ts        # Zustand cart store (persisted)
    useAddToCart.ts     # Add-to-cart hook
  auth/authStore.ts     # Zustand auth store
  store/productStore.ts # Zustand product store
  utils/
    adminAuth.ts        # Server-side admin auth guard — exports requireAdmin()
    api.ts              # jsonOk/jsonBad response helpers + client fetch helpers
    discountCalc.ts     # Discount calculation logic
    formatPrice.ts      # Price formatting (INR)
    loadScript.ts       # Dynamic script loader (Razorpay SDK)
    recalculateRating.ts # Re-aggregates a product's rating from its reviews
    seo.ts              # SEO metadata helpers
    validators.ts       # Zod schemas

middleware.ts           # Route protection for /account and /admin paths
scripts/                # schema.sql + apply-schema.ts (apply with tsx)
```

## Database (PostgreSQL)

Access is through a **repository layer** (`lib/repositories/*.repository.ts`), not an ORM. Each repo
uses the `query`/`rows`/`one` helpers from `lib/db/postgres.ts`. The schema is **hybrid-normalized**:
relational columns for the fields that are queried/filtered, plus a `content` JSONB column for
presentational data. Repos map rows back to Mongo-style docs with an `_id` field (the UUID `id`) so
older calling code keeps working.

**Schema:** `scripts/schema.sql` (UUID PKs via `pgcrypto`, FKs, CHECK constraints).
**Apply / reset locally:** `createdb punchraksha && npx tsx scripts/apply-schema.ts`.
Tables: `users`, `user_addresses`, `products`, `orders`, `order_items`, `reviews`, `blogs`,
`content_pages`, `coupons`, `testimonials`, `site_settings`.

Entities:
- **products** — name, slug, price, discounted_price, discount_percent, category, product_type, pack_unit, in_stock, is_archived, is_best_selling, is_upsell_product, cod_available, overall_rating, total_reviews; `content` JSONB holds images (url/filename/altText), packOptions, benefits, ingredients, faqs, tags, etc.
- **orders / order_items** — userId/guestPhone, shipping address, subtotal/discount/total, razorpay IDs, shiprocket IDs (orderId, shipmentId, awbCode, labelUrl, trackingUrl), status enum: `pending → paid → processing → shipped → delivered → cancelled`, paymentMethod (COD | Prepaid)
- **users / user_addresses** — phone, role (`customer`|`admin`), addresses
- **blogs** — rich text CMS content with slug
- **content_pages** — dynamic landing page layouts with slug
- **coupons** — discount codes and validation logic
- **reviews** — star ratings linked to products; aggregated onto `products.overall_rating` via `recalculateRating`
- **testimonials**, **site_settings** — homepage testimonials and global settings

## Authentication Flow

### Customer Auth (MSG91 OTP)
1. User enters phone → `POST /api/otp/send` calls the MSG91 OTP API (`MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID`); MSG91 stores/validates the OTP, and the user is upserted in Postgres via `usersRepo.upsertByPhone`
2. `POST /api/otp/verify` verifies the code with MSG91 → sets `punchraksha_token` JWT cookie (7-day, httpOnly); `/api/otp/resend` re-triggers a send
3. Middleware protects `/account/*` and `/dashboard` — redirects to `/login` if no cookie
4. Legacy `/api/auth/firebase-verify` and `/api/auth/dev-login` still exist but MSG91 is the active path

### Admin Auth
1. POST `/api/admin/auth/login` with email + password → validates against env vars → sets same `punchraksha_token` cookie with `role: "admin"`
2. Middleware protects `/admin/*` and `/api/admin/*`
3. `lib/utils/adminAuth.ts` provides server-side guard for admin API routes

Cookie name: `punchraksha_token` (shared for both customer and admin sessions)

## Payment Flow (Razorpay)

1. `POST /api/create-order` — creates Razorpay order, saves pending Order row in Postgres
2. Client opens Razorpay checkout modal
3. `POST /api/verify-payment` — verifies HMAC signature, updates Order status to `paid`, triggers Shiprocket order creation

## Shipping Flow (Shiprocket)

- Shiprocket token auto-refreshed via `lib/shiprocket/auth.ts`
- `ShiprocketService` class handles: `createAdhocOrder`, `assignAWB`, `generatePickup`, `trackShipment`, `printInvoice`
- Webhook at `/api/webhooks/shiprocket/order` receives status updates
- `ShiprocketProvider` component is **currently commented out** in `app/layout.tsx`

## Environment Variables (`.env`)

The project reads from **`.env`** (scripts also fall back to `.env.local`). Actual keys in use:

```env
# Database (PostgreSQL — node-postgres)
DATABASE_URL=postgresql://localhost:5432/punchraksha   # SSL auto-enabled for non-local hosts

# Cloudflare R2 (server-only — do NOT prefix with NEXT_PUBLIC_)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=          # public host used for next/image (also allowed in next.config.mjs)

# Auth
NEXT_PUBLIC_JWT_SECRET=
NEXT_PUBLIC_ADMIN_EMAIL=
NEXT_PUBLIC_ADMIN_PASSWORD=

# Customer OTP (MSG91)
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=

# Payments (Razorpay)
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_RAZORPAY_KEY_SECRET=

# Shiprocket
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=
SHIPROCKET_CHECKOUT_API_KEY=
SHIPROCKET_CHECKOUT_API_SECRET=

# Public URLs / misc
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_BASE_URL=
# Firebase client keys (legacy — left in place from the pre-migration auth flow)
NEXT_PUBLIC_FIREBASE_*=
```

> ⚠️ Several secrets use the `NEXT_PUBLIC_` prefix (JWT secret, admin password, Razorpay secret) — these are **exposed to the browser bundle**. This is a known security smell; move them to server-only vars when touching auth/payments. R2 and MSG91 keys are correctly server-only.

## Key Patterns & Conventions

### API Routes
- All admin API routes call `requireAdmin()` from `lib/utils/adminAuth.ts` at the top and 401 if it returns null
- Query the DB via the helpers in `lib/db/postgres.ts` (`query`, `rows`, `one`, `withTransaction`) — usually indirectly through a repository in `lib/repositories/`. The `pg` Pool is a cached singleton, safe to use on every request
- Responses use `jsonOk(...)` / `jsonBad(message, status)` from `lib/utils/api.ts`

### Cart
- Cart state is Zustand-persisted in `localStorage` under key `punchraksha-cart`
- Cart items are keyed by `(productId, packLabel)` pair — a product with multiple pack options occupies separate cart slots
- `CartDrawer` is lazy-loaded (`dynamic` with `ssr: false`) to avoid hydration issues

### Image Uploads
- Images uploaded via `POST /api/admin/upload` (multipart form, `file` + optional `prefix` of products|blogs|content|misc) → stored in **Cloudflare R2** via `lib/r2/client.ts` (`uploadToR2`); the public R2 URL is saved in the DB
- Validation: `isAllowedImage(file.type)` + `MAX_UPLOAD_BYTES` (8MB)
- Product images have `{ url, filename, altText }` shape; drag-reorder supported in `ProductForm` via `@dnd-kit`
- `next.config.mjs` whitelists R2 hosts (`*.r2.dev`, `*.r2.cloudflarestorage.com`, and the `R2_PUBLIC_BASE_URL` host) for `next/image` — external image hosts must be added there or `next/image` throws

### SEO
- `app/sitemap.ts` and `app/robots.ts` are present
- Global metadata in `app/layout.tsx` with `metadataBase: new URL("https://www.punchraksha.com")`
- Currently `robots: { index: false }` — **flip to `true` before going live in production**

### Fonts
- `--font-outfit` (body) and `--font-rem` (display) CSS variables, applied on `<body>` via `outfit.variable rem.variable`

## Deployment (AWS Amplify)

- **Critical**: CloudFront must be configured to forward the `punchraksha_token` cookie to the origin, otherwise the auth middleware redirects on every prefetch
- The `middleware.ts` matcher covers `/account/:path*`, `/admin/:path*`, `/api/admin/:path*`

## Scripts

The `scripts/` folder currently holds the schema and its applier (run with `tsx`):
```bash
npx tsx scripts/apply-schema.ts   # applies scripts/schema.sql to DATABASE_URL (idempotent CREATE IF NOT EXISTS)
```
There is **no seed script** — the database starts empty. Add products/content through the admin panel.

### First-time local setup
```bash
createdb punchraksha                 # create the local Postgres DB (must exist or every route 500s)
npx tsx scripts/apply-schema.ts      # create tables
npm run dev                          # http://localhost:3000 (falls back to 3001 if taken)
```

## Admin Panel

- URL: `/admin-login`
- Dashboard shows revenue totals, order count, catalog counts
- Products: full CRUD with image gallery (drag-reorder), pack options, SEO fields
- Orders: status pipeline — `pending → paid → processing → shipped → delivered`
- Blogs: CMS for educational content
- Content: Dynamic landing page builder (`ContentPage` model)
