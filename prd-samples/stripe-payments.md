# Stripe Payments Integration

## Overview

Add Stripe Checkout to the existing e-commerce application. Users should be able to purchase items
from the cart, be redirected to Stripe's hosted checkout page, and return to a confirmation screen.

## Requirements

### Functional Requirements

1. **Checkout Session** — Create a Stripe Checkout Session server-side with line items derived
   from the current cart state.
2. **Redirect Flow** — After session creation, redirect the user to `session.url`.
3. **Success Page** — On return from Stripe (`?session_id=...`), verify the session and display
   a confirmation with order details.
4. **Cancel Page** — If the user cancels on Stripe, return them to the cart with no changes.
5. **Webhook Handler** — Handle `checkout.session.completed` to mark orders as paid in the
   database and trigger fulfillment.

### Non-Functional Requirements

- Stripe keys must be read from environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- Webhook endpoint must verify the Stripe signature — reject unverified requests with 400.
- No card data ever touches our servers (Stripe-hosted checkout only).

## Acceptance Criteria

- [ ] `POST /api/checkout/session` creates a session and returns `{ url }`.
- [ ] Visiting `/checkout/success?session_id=cs_...` shows order summary.
- [ ] Visiting `/checkout/cancel` returns user to `/cart`.
- [ ] `POST /api/webhooks/stripe` verifies signature and updates `orders.status = 'paid'`.
- [ ] All new code covered by tests (Vitest, with Stripe SDK mocked).

## Stack Context

- Framework: Next.js 15 App Router
- Database: Supabase (PostgreSQL) — `orders` table has `id`, `user_id`, `status`, `total_cents`
- Auth: Supabase Auth (user session available in server components via `createServerClient`)
- Package manager: pnpm
