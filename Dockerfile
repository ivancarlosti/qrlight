# Node.js 26 (Alpine). Pinned to the 26 line instead of the floating
# node:lts-alpine tag: Node 26 becomes Active LTS on 2026-10-28, and the
# floating tag silently switches majors on every rebuild (the next flip, Node
# 28, would arrive the same way). A rebuild still resolves the newest 26.x
# patch and Alpine release, so Node/Alpine security fixes arrive without a
# code change. Bump this tag deliberately after testing the app on the new
# major.
#
# Build stage
FROM node:26-alpine AS builder
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

# Overwrite the GitHub link and the app title with user's specific text
RUN find src -type f -exec sed -i 's|https://github.com/lyqht/mini-qr|https://github.com/ivancarlosti/qrlight|g' {} + && \
  sed -i 's/Mini QR Code Generator/QRLight/g' index.html && \
  find locales -type f -name "*.json" -exec sed -i 's/Mini QR Code Generator/QRLight/g' {} + && \
  find locales -type f -name "*.json" -exec sed -i 's/Mini QR/QRLight/g' {} + && \
  find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i 's/MiniQR/QRLight/g' {} +

# Set custom variables to be baked into the image
ENV VITE_DEFAULT_PRESET=Plain
ENV VITE_HIDE_CREDITS=true
ENV VITE_DISABLE_LOCAL_STORAGE=true

# Install dependencies and build the app
RUN npm install
RUN npm run build

# Production stage
FROM node:26-alpine AS production
WORKDIR /app

# Stamp the release into the image metadata. build.yml passes VERSION/COMMIT;
# the defaults match a plain `docker build` from a checkout.
ARG VERSION=dev
ARG COMMIT=unknown
LABEL org.opencontainers.image.title="QRLight" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.source="https://github.com/ivancarlosti/qrlight"

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Install the server to serve the static assets
RUN npm install -g serve
EXPOSE 8080

# Serve the app
CMD ["serve", "-s", "dist", "-l", "8080"]
