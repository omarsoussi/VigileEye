# ── Stage 1: Build ──────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Accept API URLs as build args (CRA bakes REACT_APP_* at build time)
ARG REACT_APP_API_URL=http://localhost:8000/api/v1
ARG REACT_APP_MEMBERS_API_URL=http://localhost:8001/api/v1
ARG REACT_APP_CAMERAS_API_URL=http://localhost:8002/api/v1
ARG REACT_APP_STREAMING_API_URL=http://localhost:8003
ARG REACT_APP_STREAMING_WS_URL=ws://localhost:8003/ws

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_MEMBERS_API_URL=$REACT_APP_MEMBERS_API_URL
ENV REACT_APP_CAMERAS_API_URL=$REACT_APP_CAMERAS_API_URL
ENV REACT_APP_STREAMING_API_URL=$REACT_APP_STREAMING_API_URL
ENV REACT_APP_STREAMING_WS_URL=$REACT_APP_STREAMING_WS_URL

# Disable CRA lint/type errors from blocking build
ENV CI=false
ENV TSC_COMPILE_ON_ERROR=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV GENERATE_SOURCEMAP=false

COPY package.json ./
RUN npm install --no-package-lock

COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
