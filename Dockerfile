# Teachmo web (frontend-only) production container.
#
# Launch path uses Nhost/Hasura; this container serves the built SPA.

FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Validate required env for a production build (Nhost configuration).
# In CI or local Docker builds, set these via --build-arg or environment.
ARG VITE_NHOST_BACKEND_URL
ARG VITE_NHOST_SUBDOMAIN
ARG VITE_NHOST_REGION
ENV VITE_NHOST_BACKEND_URL=${VITE_NHOST_BACKEND_URL}
ENV VITE_NHOST_SUBDOMAIN=${VITE_NHOST_SUBDOMAIN}
ENV VITE_NHOST_REGION=${VITE_NHOST_REGION}
RUN node scripts/preflight-env.mjs
RUN npm run prebuild
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 4173
CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
