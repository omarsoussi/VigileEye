FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# Use `npm ci` when lockfile exists; otherwise fall back to `npm install`.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy project files after installing deps to leverage Docker layer caching
COPY . .
# If project has a build script, run it (best-effort).
RUN if [ -f package.json ] && grep -q "\"build\"" package.json; then npm run build || true; fi
EXPOSE 3000
CMD ["sh", "-c", "npm run start || npm run dev || serve -s build -l 3000"]
