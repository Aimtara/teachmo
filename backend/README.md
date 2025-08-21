# Teachmo Backend API

This directory contains a simple Node.js/Express backend to serve as the starting point for Teachmo's server‑side functionality. The API exposes endpoints to power your front‑end and future integrations (e.g. with Google Classroom and school information systems).

## Getting Started

1. **Install dependencies**

   Navigate into the `backend` directory and install the Node dependencies:

   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and adjust values as needed:

   ```bash
   cp .env.example .env
   ```

   The example file includes the `PORT` for the API server and PostgreSQL connection
   settings (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Update these
   values to match your local environment.

3. **Run the server**

   Use the `start` script to run the API:

   ```bash
   npm start
   ```

   The server will start on the configured `PORT` (default is `4000`). You can test it by visiting `http://localhost:4000/api` in your browser or using a tool like `curl`:

   ```bash
   curl http://localhost:4000/api
   # => { "message": "Welcome to the Teachmo API" }
   ```

4. **Run in development mode**

   During development, you can use the `dev` script to run the server with automatic reloads when files change:

   ```bash
   npm run dev
   ```

## Structure

The backend currently includes:

* `index.js` – Main entry point that configures Express, loads middleware, and mounts routes.
* `routes/assignments.js` – Routes for working with assignments backed by a PostgreSQL
  table. You can add more files under `routes/` to handle other resources (e.g.
  courses, users, events).
* `.env.example` – Example environment configuration. Copy to `.env` to customize.
* `Dockerfile` – Configuration for building a containerized version of the API.
* `docker-compose.yml` – Example `docker-compose` configuration to run the API alongside a PostgreSQL database locally.

This is a minimal scaffold to get you started. You should expand it to include database models, authentication and RBAC, integration services, and any other functionality described in the PRD.