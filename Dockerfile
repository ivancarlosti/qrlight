# Build stage
FROM node:lts-alpine AS builder
WORKDIR /app

# Install git so we can clone the repo
RUN apk add --no-cache git

# Copy the control file to /tmp so /app remains empty for git clone
COPY mini-qr-version.txt /tmp/mini-qr-version.txt

# Clone the specific version of the repository
RUN VERSION=$(cat /tmp/mini-qr-version.txt) && \
    if [ "$VERSION" = "main" ] || [ -z "$VERSION" ]; then \
      git clone --depth 1 https://github.com/lyqht/mini-qr.git .; \
    else \
      git clone --branch "$VERSION" --depth 1 https://github.com/lyqht/mini-qr.git .; \
    fi

# Set custom variables to be baked into the image
ENV VITE_DEFAULT_PRESET=plain
ENV VITE_HIDE_CREDITS=true
ENV VITE_DISABLE_LOCAL_STORAGE=true

# Install dependencies and build the app
RUN npm install
RUN npm run build

# Production stage
FROM node:lts-alpine AS production
WORKDIR /app

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Install the server to serve the static assets
RUN npm install -g serve
EXPOSE 8080

# Serve the app
CMD ["serve", "-s", "dist", "-l", "8080"]
