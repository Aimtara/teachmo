# Teachmo web (frontend-only) production container.
#
# Launch path uses Nhost/Hasura; this container serves the built SPA.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Validate required env for a production build (VITE_NHOST_BACKEND_URL)
# In CI or local Docker builds, set it via --build-arg or environment.
ARG VITE_NHOST_BACKEND_URL
ENV VITE_NHOST_BACKEND_URL=${VITE_NHOST_BACKEND_URL}
RUN node scripts/preflight-env.mjs
RUN npm run prebuild
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

RUN npm i -g serve
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
