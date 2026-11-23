# CampusNest

A campus marketplace for students to sell, rent, borrow or skill-swap items such as books, calculators, laptops and hostel essentials.

## Features

- **Accounts**: register with a college email (`@iiitsonepat.ac.in`) and unique enrollment number, verify email, sign in, and request a password reset. Passwords use bcrypt. JWT bearer tokens are stored in browser `localStorage`.
- **Listings**: create and edit listings, search, filter, sort and paginate. Sellers can soft-delete their own listings or change availability. Photos accept JPEG, PNG or WebP up to 10 MB and are decoded and dimension-checked before Cloudinary upload.
- **Messaging**: buyers and sellers chat about a listing. New messages and unread counts update over Socket.IO. History is paginated; hiding a conversation removes it only from the current user's inbox. A first-message auto-reply shares seller contact details only when the seller has opted in.
- **ARIA**: a Gemini-powered chat assistant. Logged-in users get short conversation memory (the last 10 messages) and can clear it from the chat panel.
- **Listing Assistant**: a rule-based helper that reads a sentence like "sell my calculator, good condition, for 500 rupees", drafts a listing and lets you confirm it. It can also search the listings.
- **Recommendations**: listings ranked for the logged-in student by department match, semester match and recency.
- **Analytics**: live marketplace counts and a category chart.
- **Seller privacy**: email and WhatsApp sharing are separate profile preferences and default to private. Contact details are returned only with the seller's consent.
- **Admin dashboard**: view paginated users and listings, delete either. Admin rights come from the `users.is_admin` column and are enforced by the API.

## Architecture

```
React + Vite (5173)  ->  Express API (8000)  ->  PostgreSQL
                              |
                              +->  Cloudinary (listing images)
                              +->  Gemini API (ARIA)
```

| Folder | What it is |
| --- | --- |
| `frontend/` | React 18, Vite, React Router, Zustand, Axios, Socket.IO client, Framer Motion. Styling is inline styles. |
| `backend/` | Express, Socket.IO, raw parameterized SQL through `pg`. `src/db/init.js` retains the legacy idempotent initializer; ordered feature migrations in `migrations/` are applied manually with `npm run migrate`. |

## Local setup

Requirements: Node.js 20.19+ (or 22.12+), PostgreSQL.

### 1. Database

```bash
createdb campusnest
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env             # then fill in the values below
npm run dev                      # http://localhost:8000
npm test
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
npm test
npm run build                    # production build
```

The frontend calls `http://127.0.0.1:8000` by default. Set `VITE_API_URL` to change it. It is read at build time, so for a deployed build set it in the build environment (for example the Vercel project settings) to the backend's public URL, and set the backend's `CLIENT_URL` to the deployed frontend's origin.

`frontend/.env` uses `VITE_API_URL`; keep `.env` files private. The root and frontend `.gitignore` rules ignore `.env`, while `backend/.env.example` is the tracked template.

## Environment variables

`backend/.env`

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/campusnest` |
| `SECRET_KEY` | Secret used to sign JWTs. Use a unique random secret in production. The built-in default is allowed only in development/test; production requires at least 32/48/64 bytes for HS256/HS384/HS512. |
| `NODE_ENV` | Use `production` for a deployed API. The built-in JWT secret is allowed only in development and test. |
| `CLIENT_URL` | Frontend origins allowed by CORS, comma-separated (default `http://localhost:5173`) |
| `TRUSTED_PROXY_CIDRS` | Optional comma-separated IP/CIDR list for trusted reverse proxies. Leave empty unless the actual proxy ranges are known; forwarded IP headers are ignored by default. |
| `PORT` | API port (default `8000`) |
| `GEMINI_API_KEY` | Enables ARIA. Without it ARIA answers with generic fallback text. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed to upload listing photos. Listings without a photo work without them. |
| `APP_URL` | Public frontend URL used in email verification and password-reset links. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP settings used for verification and password-reset email. |
| `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | HMAC JWT settings. Supported algorithms are HS256/HS384/HS512. Production defaults to 60 minutes; set a non-default secret of at least 32/48/64 bytes respectively. |

New registrations must verify their college email before logging in. Verification links expire after 24 hours; password-reset links expire after 30 minutes and can be used once. Configure SMTP in the deployed backend; registration is rolled back if the verification email cannot be delivered.

Access tokens are bearer JWTs stored in browser `localStorage`; signing out clears the browser copy. Tokens expire according to `ACCESS_TOKEN_EXPIRE_MINUTES`. Password reset increments the account token version and invalidates previously issued tokens. Verification and reset links contain single-use random tokens; only token hashes are stored in PostgreSQL.

## Deployment

| Part | Platform (free tier) | URL |
| --- | --- | --- |
| Frontend | Vercel, root directory `frontend` | https://campusnest-rose.vercel.app |
| Backend | Render web service, root directory `backend`, Singapore | https://campusnest-server.onrender.com |
| Database | Neon PostgreSQL, Singapore | - |

The URLs below are the deployment targets documented for this project. `frontend/vercel.json` provides the SPA route fallback. No Render service manifest is stored in this repository, and hosting secrets are not available here; verify the backend service's branch, build/start commands and environment in the provider dashboard before release.

- **Backend**: build `npm ci`, start `npm start`, `NODE_VERSION=22`, `NODE_ENV=production`. Set the variables from the table above; `CLIENT_URL` is the frontend origin and `APP_URL` is used in verification/reset links. `/health/live` checks process liveness; `/health/ready` and `/health` check database readiness. Configure the host health check to `/health/ready`.
- **Frontend**: `VITE_API_URL` in the Vercel project settings is the backend URL. It is read at build time, so redeploy after changing it.
- **Database**: Neon's connection string, with `sslmode=verify-full`.

### Safe database deployment

Schema updates are versioned in `backend/migrations/`. The API startup initializer remains in place for the legacy baseline, but does not apply versioned migrations. Before deploying a schema change:

1. Take and verify a database backup, then restore it to a disposable staging database.
2. Set the staging `DATABASE_URL` and required environment variables in a private environment; do not commit them.
3. From `backend/`, run `npm ci`, `npm test`, and `npm run migrate`. Confirm the migration history and exercise the application against that staging copy.
4. Take a fresh production backup. Run `npm run migrate` with the production `DATABASE_URL` only after the staging run and backup have been reviewed.
5. Deploy the backend and frontend, then check `/health/ready`, registration/verification, login/reset, listing browse/upload, messaging and admin authorization with non-production test accounts.

The migration runner uses a PostgreSQL advisory lock, checks stored checksums, refuses a partial legacy schema, and applies each pending SQL migration in a transaction. Migrations are forward-only: repair with a new migration, or restore a verified backup if recovery requires rollback. It does not reset or seed data. Do not run it against a database until its target is verified.

### Rate limits

The configured limits are:

| Operation | Limit |
| --- | --- |
| General API | 300 requests per 5 minutes per IP |
| Register, login, resend verification, forgot/reset password | 20 requests per 15 minutes per IP |
| Resend verification and forgot password | Also 3 requests per hour per normalized email hash |
| Guest ARIA | 10 requests per 15 minutes per IP |
| Signed-in ARIA, listing assistant and search | 30 per 15 minutes per IP and 20 per 15 minutes per user |
| Listing creation and image upload | 40 per 15 minutes per IP and 20 per hour per user |
| Message creation | 120 per 15 minutes per IP and 60 per 15 minutes per user |

The general API limit is applied in addition to the route-specific limits. The current limiter uses an in-process memory store, so counters are local to one backend process and reset on restart. If multiple API instances are enabled, configure a shared store before relying on limits across instances. Trusted proxy IP ranges are opt-in through `TRUSTED_PROXY_CIDRS`.

Free Render services sleep after 15 minutes without traffic, so the first request after a quiet period takes about a minute. While that happens the frontend shows a "Waking up the server" notice (`ServerStatusBanner`), driven by the backend's `/health` endpoint.

## How the features work

- **Recommendations are rule-based**: +3 for a department match, +2 for a semester match, +1 for any recent listing.
- **Analytics** are SQL aggregates.
- **Listing Assistant** is keyword and regex extraction. It is not an autonomous agent.
- **Quick replies** in chat are fixed text. Seller contact information appears in listing responses or first-message replies only for fields the seller opted to share; withdrawing consent removes those fields from API responses and historical automatic replies.
- **Listing rules**: price must be greater than zero and no more than 10,000,000; condition is rated from 1 to 5. Availability transitions depend on the listing type, and new buyer enquiries are blocked after a listing is inactive or no longer available.
- **Images** must be JPEG, PNG or WebP, at most 10 MB, and decode within the configured pixel limits before upload.
- **Messaging** loads history in pages. Hiding a conversation affects the current user's inbox only; a new message makes it visible again.
- **ARIA history** can be cleared for the signed-in user's account from the chat panel.

## Limitations

- Messaging has no online/typing status. Live updates need the backend to run as a long-lived server (Socket.IO shares the API's port), not as serverless functions.
- Only `@iiitsonepat.ac.in` email addresses can register (`COLLEGE_EMAIL_DOMAIN` in `backend/src/config/constants.js` and `frontend/src/pages/Register.jsx`); the address must be verified before sign-in. Admin accounts can only be created in the database.
- Browser tokens are stored in `localStorage`, so an issued token remains usable until expiration unless a password reset increments the user token version. Sign-out clears only that browser copy.
- Photo upload needs Cloudinary credentials.
- A listing priced at exactly 1 rupee is shown as "Negotiable" in the UI.
- Automated tests cover selected security and account flows. There is no dedicated PostgreSQL integration or full browser end-to-end suite yet; SMTP, Cloudinary, Gemini, and deployed-host behavior require staging smoke tests.
