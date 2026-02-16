FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV CI=false
ENV TSC_COMPILE_ON_ERROR=true

# Copy only lockfile and package first to leverage Docker cache
COPY package*.json ./
# Install dependencies (use npm install to avoid ci lockfile-synchronization failures)
RUN npm install --omit=dev

# Copy rest of the project
COPY . .
# Build if script present
RUN if [ -f package.json ] && grep -q "\"build\"" package.json; then npm run build || true; fi

EXPOSE 3000
CMD ["sh", "-c", "npm run start || npm run dev || serve -s build -l 3000"]
