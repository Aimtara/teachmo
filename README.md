# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

1. Copy `.env.example` to `.env` and provide your values. At minimum set:
   - `VITE_NHOST_BACKEND_URL` with your Nhost project backend URL
   - `VITE_API_BASE_URL` to your API hostname (defaults to `/api` for local proxying)
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Deploying to Vercel

The repo includes a `vercel.json` configured for a Vite SPA build with client-side routing rewrites. Set the `VITE_NHOST_BACKEND_URL` and `VITE_API_BASE_URL` environment variables in your Vercel project and push the repo; Vercel will run `npm run build` and serve `dist/` automatically.

For backend testing, run `npm run dev` inside `backend/` with the same environment variables (see `.env.example`).

For more information and support, please contact Base44 support at app@base44.com.