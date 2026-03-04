# ─────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Cache dependency downloads
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /streaming-backend ./cmd/server

# ─────────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    tzdata

WORKDIR /app

COPY --from=builder /streaming-backend /app/streaming-backend
COPY .env.example /app/.env.example

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8003

# WebRTC UDP port range
EXPOSE 50000-50100/udp

ENTRYPOINT ["/app/streaming-backend"]
