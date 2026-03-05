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
    go build -ldflags="-s -w" -o /storage-backend ./cmd/server

# ─────────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    tzdata

WORKDIR /app

# Create storage directory
RUN mkdir -p /app/data/recordings

COPY --from=builder /storage-backend /app/storage-backend
COPY .env.example /app/.env.example

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/data
USER appuser

EXPOSE 8004

ENTRYPOINT ["/app/storage-backend"]
