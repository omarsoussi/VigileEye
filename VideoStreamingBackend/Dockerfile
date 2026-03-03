FROM node:20-slim

WORKDIR /app

# Install FFmpeg + mediasoup build dependencies (C++ worker compilation)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      build-essential \
      pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (mediasoup compiles C++ workers during npm install)
COPY package.json ./
RUN npm install --production=false

# Copy source
COPY tsconfig.json ./
COPY src/ src/

# Build TypeScript
RUN npx tsc

# Remove dev dependencies for smaller image
# Keep build artifacts (mediasoup worker binaries are in node_modules)
RUN npm prune --production

# mediasoup uses UDP ports for RTP media
EXPOSE 8003
EXPOSE 40000-40100/udp

CMD ["node", "dist/main.js"]
