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

# The application source is vendored in this repository, so nothing is cloned
# from upstream at build time. pnpm is pinned to the major that produced
# pnpm-lock.yaml; Node 26 no longer bundles Corepack, so it is installed
# explicitly.
RUN npm install -g pnpm@10

# Dependencies first, so the install layer is reused while only app code
# changes.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# QRLight defaults baked into the static build. VITE_APP_VERSION is the tag
# this image was built from (build.yml passes VERSION), shown in the footer
# instead of the vendored upstream CHANGELOG version.
ARG VERSION=dev
ENV VITE_APP_VERSION=${VERSION}
ENV VITE_DEFAULT_PRESET=Plain
ENV VITE_HIDE_CREDITS=true
ENV VITE_DISABLE_LOCAL_STORAGE=true

RUN pnpm build

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

# Install the server to serve the static assets
RUN npm install -g serve@14

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Serve the app
CMD ["serve", "-s", "dist", "-l", "8080"]
