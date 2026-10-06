# CampusNest

A campus marketplace for students to sell, rent, borrow or skill-swap items such as books, calculators, laptops and hostel essentials.

## Features

- **Accounts**: register with a college email (`@iiitsonepat.ac.in`) and an enrollment number, both unique per account, log in, log out (JWT, bcrypt-hashed passwords). Profile with an optional WhatsApp number.
- **Listings**: post with a photo, browse, search and filter, edit your own listing, delete it (soft delete, so it stays gone after a refresh). Four listing types: sell, rent, borrow, swap.
- **Price estimate**: an ML model suggests a fair resale price from the item's category, original price, condition and months used.
- **Spam check**: new and edited listings are scored by a text classifier and shown with a spam-risk badge.
- **Messaging**: buyer and seller can chat about a listing. New messages and the unread badge update in real time over Socket.IO. Unread counts are tracked per message. The first message to a seller gets a canned automatic reply with the seller's contact details.
- **ARIA**: a Gemini-powered chat assistant. Logged-in users get short conversation memory (the last 10 messages).
- **Listing Assistant**: a rule-based helper that reads a sentence like "sell my calculator, good condition, bought for 1500 rupees", drafts a listing and lets you confirm it. It can also search the listings.
- **Recommendations**: listings ranked for the logged-in student by department match, semester match and recency.
- **Analytics**: live marketplace counts and a category chart.
- **Admin dashboard**: view users and listings, delete either. Admin rights come from the `users.is_admin` column.

## Architecture

```
React + Vite (5173)  ->  Express API (8000)  ->  PostgreSQL
                              |
                              +->  FastAPI ML service (8001): price + spam models
                              +->  Cloudinary (listing images)
                              +->  Gemini API (ARIA)
```

| Folder | What it is |
| --- | --- |
| `frontend/` | React 18, Vite, React Router, Zustand, Axios, Socket.IO client, Framer Motion. Styling is inline styles. |
| `backend/` | Express, Socket.IO, raw parameterized SQL through `pg`. Schema is created and updated on startup in `src/db/init.js`. |
| `ml-service/` | FastAPI app that serves two scikit-learn models loaded once at startup. |

## Local setup

Requirements: Node.js 20.19+ (or 22.12+), Python 3.10 to 3.12 (the pinned numpy and scikit-learn versions do not support 3.13), PostgreSQL.

### 1. Database

```bash
createdb campusnest
```

### 2. ML service

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py                   # http://localhost:8001
```

The trained models (`*.pkl`) are included. If they are missing, they are retrained on startup.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env             # then fill in the values below
npm run seed                     # optional demo data
npm run dev                      # http://localhost:8000
```

### 4. Frontend

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
| `ML_SERVICE_URL` | ML service address (default `http://localhost:8001`) |
| `GEMINI_API_KEY` | Enables ARIA. Without it ARIA answers with generic fallback text. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed to upload listing photos. Listings without a photo work without them. |
| `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT settings (defaults `HS256`, `10080`) |

`ml-service/.env`: `ML_SERVICE_PORT` (default `8001`).

### Demo data

`npm run seed` is safe to run more than once. It creates 8 demo students (for example `arjun@iiitsonepat.ac.in`), sample listings, and one admin account, `admin@campusnest.com`. All seeded accounts use the password `demo1234`. This is for local development only.

## Deployment

| Part | Platform (free tier) | URL |
| --- | --- | --- |
| Frontend | Vercel, root directory `frontend` | https://campusnest-rose.vercel.app |
| Backend | Render web service, root directory `backend`, Singapore | https://campusnest-server.onrender.com |
| ML service | Render web service, root directory `ml-service`, Oregon | https://campusnest-ml.onrender.com |
| Database | Neon PostgreSQL, Singapore | - |

All three deploy automatically on a push to `main`.

- **Backend**: build `npm ci`, start `npm start`, health check `/health`, `NODE_VERSION=22`, `NODE_ENV=production`. Set the variables from the table above; `CLIENT_URL` is the Vercel URL and `ML_SERVICE_URL` the ML service URL. The schema is created on startup.
- **Frontend**: `VITE_API_URL` in the Vercel project settings is the backend URL. It is read at build time, so redeploy after changing it.
- **Database**: Neon's connection string, with `sslmode=verify-full`. The live database was seeded with the demo data; its admin account has its own password, not `demo1234`.

Free Render services sleep after 15 minutes without traffic, so the first request after a quiet period takes about a minute. While that happens the frontend shows a "Waking up the server" notice (`ServerStatusBanner`), driven by the backend's `/health` endpoint. The backend wakes the ML service when it starts; until that finishes, listings show "Spam check unavailable" and price estimates ask the user to try again in a minute.

## How the ML features work

- **Price estimate**: a `RandomForestRegressor` on category, original price, condition, months used and demand score. It was trained on **synthetic, formula-generated data**, not real campus sales, so treat the result as a rough guide. It is not trained on the `Other` category, so no estimate is offered there. Note that it needs the item's *original* price; your asking price is entered separately.
- **Spam check**: TF-IDF features with Logistic Regression, trained on a small dataset. It gives a spam-risk score, not a guarantee. If the ML service is down, listings show "Spam check unavailable" instead of a pass.
- **Recommendations are rule-based**, not machine learning: +3 for a department match, +2 for a semester match, +1 for any recent listing.
- **Analytics** are SQL aggregates.
- **Listing Assistant** is keyword and regex extraction plus calls to the two models above. It is not an autonomous agent.
- **Quick replies** in chat are fixed text.

## Limitations

- Messaging has no online/typing status. Live updates need the backend to run as a long-lived server (Socket.IO shares the API's port), not as serverless functions.
- Only `@iiitsonepat.ac.in` email addresses can register (`COLLEGE_EMAIL_DOMAIN` in `backend/src/config/constants.js` and `frontend/src/pages/Register.jsx`). The domain is checked, but the address itself is not verified, and there is no password reset.
- The JWT is kept in `localStorage`. Admin accounts can only be created in the database (the seed script does this).
- Photo upload needs Cloudinary credentials.
- A listing priced at exactly ₹1 is shown as "Negotiable" in the UI.
- There are no automated tests in this repository.
