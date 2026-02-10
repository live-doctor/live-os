# Homeio App Store Guide

Quick reference for browsing and importing app catalogs.

## Overview

Homeio imports app catalogs from supported API endpoints and lets you deploy custom Docker Compose stacks directly from the App Store UI. The LinuxServer.io catalog is always available and cannot be removed.

## Quick Start

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Open the App Store (LinuxServer.io is available by default)
4. Optional: choose **Import Community App Store** to add another catalog

Example API endpoint:

```
https://api.linuxserver.io/api/v1/images?include_config=true&include_deprecated=true
```

## Supported Sources

- LinuxServer.io API endpoints (JSON)
- Local catalog in `/store` (auto-imported)

ZIP-based stores are not supported.

## Import Flow

1. Paste an API endpoint in the import dialog.
2. Homeio downloads the catalog and generates a compose file per app.
3. Apps appear in the App Store and can be installed.

Local catalogs:

1. Create a folder under `/store/<app-id>/`
2. Add `docker-compose.yml` (and optional `app.json`)
3. Refresh stores from App Store settings

## Custom Deploy

Use **Custom Deploy** in the App Store to paste your own Docker Compose YAML. This is the recommended path for catalogs that are not available as a supported API source.

## Refreshing Stores

Open App Store settings and click **Refresh All** to re-download imported stores.
