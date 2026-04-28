# QRLight

This repository automatically tracks and builds customized Docker images for the [mini-qr](https://github.com/lyqht/mini-qr) project.

## What it does

- **Automated Updates**: A GitHub Action runs daily (at 9:44 AM UTC) to check the upstream `lyqht/mini-qr` repository for any new releases. 
- **Version Tracking**: If a new release is found, it automatically updates the `mini-qr-version.txt` control file and commits the change.
- **Custom Docker Build**: The repository contains a `Dockerfile` that clones the specific release of `mini-qr` and builds the static application with a predefined set of environment variables baked into the final image.

## Built-in Configuration

The Docker image is built with the following custom environment variables:

- `VITE_DEFAULT_PRESET=plain`: Sets the default QR code style preset to "plain".
- `VITE_HIDE_CREDITS=true`: Hides the footer credits in the user interface.
- `VITE_DISABLE_LOCAL_STORAGE=true`: Prevents the app from loading previously saved settings on startup, ensuring the fixed preset is always shown to the user.

## CI/CD Pipeline

Because of the automated version tracking, any new release of `mini-qr` will result in a new commit to this repository. This mechanism seamlessly triggers your existing repository pipelines that monitor for new pulls/pushes to automatically build and push the updated Docker image!
