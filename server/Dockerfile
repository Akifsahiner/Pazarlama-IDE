FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Node 22 (Playwright image ships Node 20; upgrade for parity with local dev)
RUN apt-get update && apt-get install -y curl \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787

CMD ["node", "dist/index.js"]
