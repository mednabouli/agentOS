# Authentication System

## Overview

Implement email + password authentication with Supabase Auth. Users should be able to sign up,
log in, log out, and access a protected dashboard. Unauthenticated users are redirected to `/login`.

## Requirements

### Functional Requirements

1. **Sign Up** — `POST /api/auth/signup` accepts `{ email, password }`, creates a Supabase user,
   sends a confirmation email.
2. **Login** — `POST /api/auth/login` exchanges credentials for a session, sets an httpOnly cookie.
3. **Logout** — `POST /api/auth/logout` invalidates the session and clears the cookie.
4. **Protected Routes** — Any route under `/dashboard/**` requires an active session.
   Unauthenticated requests redirect to `/login?next=<original-path>`.
5. **Profile** — `GET /api/auth/me` returns `{ id, email, createdAt }` for the authenticated user.

### Non-Functional Requirements

- Use Next.js Middleware to protect routes — no per-page auth checks.
- Passwords are never stored in our DB (Supabase Auth handles hashing).
- Session cookie is `httpOnly`, `sameSite: lax`, `secure` in production.

## Acceptance Criteria

- [ ] `POST /api/auth/signup` returns 201 on success, 409 if email already exists.
- [ ] `POST /api/auth/login` returns 200 with `{ user }` and sets `sb-access-token` cookie.
- [ ] `GET /dashboard` with no session redirects to `/login?next=/dashboard`.
- [ ] `GET /dashboard` with valid session renders the protected page.
- [ ] `POST /api/auth/logout` clears the session cookie and returns 200.
- [ ] All auth routes covered by integration tests (real Supabase test project or MSW mocks).

## Stack Context

- Framework: Next.js 15 App Router + TypeScript strict mode
- Auth provider: Supabase Auth (`@supabase/ssr`)
- Database: Supabase PostgreSQL
- Testing: Vitest + MSW for API mocking

## Files to Create / Modify

- `src/middleware.ts` — route protection logic
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/login/page.tsx` — login form (client component)
- `src/app/dashboard/layout.tsx` — protected layout
- `src/lib/supabase/server.ts` — `createServerClient` helper
- `src/lib/supabase/middleware.ts` — `createMiddlewareClient` helper
