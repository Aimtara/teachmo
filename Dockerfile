# Teachmo web (frontend-only) production container.
#
# Launch path uses Nhost/Hasura; this container serves the built SPA.

FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN rm -f package-lock.json && npm install

COPY . .
# Validate required env for a production build (VITE_NHOST_SUBDOMAIN)
# In CI or local Docker builds, set it via --build-arg or environment.
ARG VITE_NHOST_SUBDOMAIN
ENV VITE_NHOST_SUBDOMAIN=${VITE_NHOST_SUBDOMAIN}
ARG VITE_NHOST_REGION
ENV VITE_NHOST_REGION=${VITE_NHOST_REGION}
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
