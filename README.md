# Bouquet Order Management System

A lightweight web application for managing bouquet orders from Instagram traffic — with a public storefront, capacity management, production workflow, and customer order tracking.

## Features

- **Public storefront** — landing page, catalog (search/filter/sort), product details
- **Order flow** — customer form, delivery date selection, payment screenshot upload
- **Capacity management** — daily limits with automatic overbooking prevention
- **Order workflow** — draft → payment → verification → production → shipping → delivered
- **Customer tracking** — lookup by order number or phone (no login required)
- **Admin dashboard** — products, orders, capacity calendar, revenue overview
- **Email notifications** — Resend integration for admin and customer updates

## Tech stack

- Next.js 16 (App Router)
- PostgreSQL + Prisma
- Tailwind CSS
- Resend (email)
- Vercel (hosting)

## Quick start

### 1. Clone and install

```bash
cd bouquet-orders
npm install
```

### 2. Database (Supabase or Neon)

Create a free PostgreSQL database and copy the connection string.

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://..."
ADMIN_PASSWORD="your-secure-password"
ADMIN_EMAIL="you@example.com"
RESEND_API_KEY=""  # optional for dev

```

### 3. Push schema and seed

```bash
npm run db:setup
```

This creates tables and seeds sample products plus 30 days of capacity.

### 4. Run locally

```bash
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin (password from `ADMIN_PASSWORD`)

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Run `prisma db push` against production DB (or use Vercel build with `db:push`)
5. Run seed once: `npm run db:seed`

## Order workflow

```
Payment Pending → Payment Verification → Confirmed → In Production
→ Ready To Ship → Shipped → Delivered
```

Admin can also cancel orders (releases capacity reservation).

## Capacity logic

When a customer picks a delivery date, the system checks:

```
booked orders + new quantity ≤ daily capacity
```

Reservations are created in a transaction to prevent race-condition overbooking.

## Project structure

```
src/
  app/           # Pages and API routes
  components/    # UI components
  lib/           # Prisma, email, capacity, auth
prisma/
  schema.prisma  # Database schema
  seed.ts        # Sample data
```

## Monthly cost

| Service   | Free tier        |
|-----------|------------------|
| Vercel    | Hobby            |
| Supabase  | 500MB DB         |
| Neon      | 0.5GB            |
| Resend    | 3,000 emails/mo  |

**₹0 initially** for low-volume validation.

## Phase 2 (not in MVP)

- WhatsApp notifications
- Instagram automation bot
- Customer login
- Coupons, reviews, CRM
