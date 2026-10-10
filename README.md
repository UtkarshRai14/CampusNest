# CampusNest

A campus marketplace for students to sell, rent, borrow or skill-swap items such as books, calculators, laptops and hostel essentials.

## Features

- **Accounts**: register with a college email (`@iiitsonepat.ac.in`) and an enrollment number, both unique per account, log in, log out (JWT, bcrypt-hashed passwords). Profile with an optional WhatsApp number.
- **Listings**: post with a photo, browse, search and filter, edit your own listing, delete it (soft delete, so it stays gone after a refresh). Four listing types: sell, rent, borrow, swap.
- **Messaging**: buyer and seller can chat about a listing. New messages and the unread badge update in real time over Socket.IO. Unread counts are tracked per message. The first message to a seller gets a canned automatic reply with the seller's contact details.
- **ARIA**: a Gemini-powered chat assistant. Logged-in users get short conversation memory (the last 10 messages).
- **Listing Assistant**: a rule-based helper that reads a sentence like "sell my calculator, good condition, for 500 rupees", drafts a listing and lets you confirm it. It can also search the listings.
- **Recommendations**: listings ranked for the logged-in student by department match, semester match and recency.
- **Analytics**: live marketplace counts and a category chart.
- **Admin dashboard**: view users and listings, delete either. Admin rights come from the `users.is_admin` column.

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
| `backend/` | Express, Socket.IO, raw parameterized SQL through `pg`. Schema is created and updated on startup in `src/db/init.js`. |

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
npm run seed                     # optional demo data
npm run dev                      # http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
npm run build                    # production build
```

The frontend calls `http://127.0.0.1:8000` by default. Set `VITE_API_URL` to change it. It is read at build time, so for a deployed build set it in the build environment (for example the Vercel project settings) to the backend's public URL, and set the backend's `CLIENT_URL` to the deployed frontend's origin.

## Environment variables

`backend/.env`

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/campusnest` |
| `SECRET_KEY` | Secret used to sign JWTs. Set your own long random value. With `NODE_ENV=production` the server will not start without it; in development an insecure built-in default is used and a warning is printed. |
| `CLIENT_URL` | Frontend origins allowed by CORS, comma-separated (default `http://localhost:5173`) |
| `PORT` | API port (default `8000`) |
| `GEMINI_API_KEY` | Enables ARIA. Without it ARIA answers with generic fallback text. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed to upload listing photos. Listings without a photo work without them. |
| `APP_URL` | Public frontend URL used in email verification links. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP settings used to send account verification emails. |
| `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT settings (defaults `HS256`, `10080`) |

### Demo data

`npm run seed` is safe to run more than once. It creates 8 demo students (for example `arjun@iiitsonepat.ac.in`), sample listings, and one admin account, `admin@campusnest.com`. All seeded accounts use the password `demo1234`. This is for local development only.

New registrations must verify their college email before logging in. The verification link expires after 24 hours. Configure the SMTP variables above in the deployed backend; without them, registration is rejected rather than creating an account that cannot be verified.

## Deployment

| Part | Platform (free tier) | URL |
| --- | --- | --- |
| Frontend | Vercel, root directory `frontend` | https://campusnest-rose.vercel.app |
| Backend | Render web service, root directory `backend`, Singapore | https://campusnest-server.onrender.com |
| Database | Neon PostgreSQL, Singapore | - |

The frontend and backend deploy automatically on a push to `main`.

- **Backend**: build `npm ci`, start `npm start`, health check `/health`, `NODE_VERSION=22`, `NODE_ENV=production`. Set the variables from the table above; `CLIENT_URL` is the Vercel URL. The schema is created on startup.
- **Frontend**: `VITE_API_URL` in the Vercel project settings is the backend URL. It is read at build time, so redeploy after changing it.
- **Database**: Neon's connection string, with `sslmode=verify-full`. The live database was seeded with the demo data; its admin account has its own password, not `demo1234`.

Free Render services sleep after 15 minutes without traffic, so the first request after a quiet period takes about a minute. While that happens the frontend shows a "Waking up the server" notice (`ServerStatusBanner`), driven by the backend's `/health` endpoint.

## How the features work

- **Recommendations are rule-based**: +3 for a department match, +2 for a semester match, +1 for any recent listing.
- **Analytics** are SQL aggregates.
- **Listing Assistant** is keyword and regex extraction. It is not an autonomous agent.
- **Quick replies** in chat are fixed text.

## Limitations

- Messaging has no online/typing status. Live updates need the backend to run as a long-lived server (Socket.IO shares the API's port), not as serverless functions.
- Only `@iiitsonepat.ac.in` email addresses can register (`COLLEGE_EMAIL_DOMAIN` in `backend/src/config/constants.js` and `frontend/src/pages/Register.jsx`). The domain is checked, but the address itself is not verified, and there is no password reset.
- The JWT is kept in `localStorage`. Admin accounts can only be created in the database (the seed script does this).
- Photo upload needs Cloudinary credentials.
- A listing priced at exactly ₹1 is shown as "Negotiable" in the UI.
- There are no automated tests in this repository.
