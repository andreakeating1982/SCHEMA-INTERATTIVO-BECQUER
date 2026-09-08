# =============================================================================
# Dockerfile — SCHEMA INTERATTIVO
# Build multi-stage: compila l'app, poi crea l'immagine di runtime leggera.
# Usato da render.yaml (Render Blueprint) e docker-compose.yml.
# =============================================================================

# ---------- STAGE 1: BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable pnpm

# Copia prima le dipendenze per sfruttare la cache di Docker
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install

# Copia il resto del progetto e compila
COPY . .
RUN pnpm build

# ---------- STAGE 2: RUNTIME ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN corepack enable pnpm

# Rimuove le patchedDependencies (servono solo in build) e installa solo le
# dipendenze di produzione
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN node -e "const p=require('./package.json'); delete p.pnpm?.patchedDependencies; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2));" && \
    pnpm install --prod

# Copia il build dal primo stage
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
