# QRLight

This repository automatically tracks and builds customized Docker images for the [mini-qr](https://github.com/lyqht/mini-qr) project.

## What it does

- **Automated Updates**: A GitHub Action runs daily (at 9:44 AM UTC) to check the upstream `lyqht/mini-qr` repository for any new releases.
- **Version Tracking**: If a new release is found, it automatically updates the `mini-qr-version.txt` control file and commits the change as `fix(deps): update mini-qr to <version>`, which semantic-release turns into a patch release and a fresh Docker image.
- **Custom Docker Build**: The repository contains a `Dockerfile` that clones the specific release of `mini-qr` and builds the static application with a predefined set of environment variables baked into the final image.

## Built-in Configuration

The Docker image is built with the following custom environment variables:

- `VITE_DEFAULT_PRESET=plain`: Sets the default QR code style preset to "plain".
- `VITE_HIDE_CREDITS=true`: Hides the footer credits in the user interface.
- `VITE_DISABLE_LOCAL_STORAGE=true`: Prevents the app from loading previously saved settings on startup, ensuring the fixed preset is always shown to the user.

## CI/CD Pipeline

Any new release of `mini-qr` produces a `fix(deps)` commit, which semantic-release turns into a patch release; the release then triggers the Docker build and pushes `ghcr.io/ivancarlosti/qrlight:latest` and `:<version>`. Because GitHub does not start workflows for commits pushed with the default `GITHUB_TOKEN`, the update workflow dispatches `semantic-release.yml` explicitly after pushing.

`build.yml` runs when a release is published and on manual dispatch with a required `version` input.
