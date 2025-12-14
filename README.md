# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Nhost serverless functions

Custom backend operations (OAuth callbacks, learning data sync, activity fetching, etc.) are now invoked through Nhost serverless functions. By default the frontend posts to `/v1/functions/<functionName>`, but you can override the base URL with the `VITE_NHOST_FUNCTIONS_URL` environment variable when running the app locally.

## Building the app

```bash
npm run build
```

For more information and support, please contact Base44 support at app@base44.com.