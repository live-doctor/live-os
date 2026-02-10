# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homeio is a self-hosted operating system dashboard for managing infrastructure, built with Next.js 16. It provides real-time system monitoring (CPU, RAM, storage), Docker container management, a web terminal, a widget-based dashboard, file management, and a multi-source app store.

**Design Philosophy**: Clean, consistent, user-friendly interface following KISS (Keep It Simple, Stupid) principles with inspiration from established self-hosted dashboards.

## Core Principles

### 1. SOLID Principles

**Always apply SOLID principles when writing or refactoring code:**

- **Single Responsibility**: Each component, function, or module should have one clear purpose
  - Good: `src/app/actions/system/system-status.ts` handles only system metrics
  - Bad: Mixing UI and business logic in same component

- **Open/Closed**: Open for extension, closed for modification
  - Good: Use composition and props for variants
  - Bad: Modifying existing components for new features

- **Liskov Substitution**: Derived classes must be substitutable for their base classes
  - Good: All app card variants follow the same `App` interface
  - Bad: Changing expected behavior in subclasses

- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
  - Good: Separate `InstalledApp` and `App` types
  - Bad: One massive type with optional fields

- **Dependency Inversion**: Depend on abstractions, not concretions
  - Good: Server actions as abstraction layer
  - Bad: Direct Docker CLI calls from components

### 2. KISS Principle (Keep It Simple, Stupid)

- **Prefer simple solutions over complex ones**
- **Avoid over-engineering**: Don't add features/abstractions until needed
- **Write readable code**: Code should be self-documenting
- **Minimize dependencies**: Only add libraries when necessary
- **Clear file structure**: Easy to navigate and understand

### 3. Micro-Component Architecture

**CRITICAL: Components must be small, focused, and reusable**

**Maximum Component Size: 100-150 lines**. If a component exceeds this, it MUST be broken down into micro-components.

#### Component Size Guidelines

| Size          | Classification | Action                |
| ------------- | -------------- | --------------------- |
| < 50 lines    | Excellent      | Ideal micro-component |
| 50-100 lines  | Good           | Acceptable            |
| 100-150 lines | Warning        | Consider splitting    |
| > 150 lines   | Violation      | MUST refactor         |

#### Breaking Down Components

When a component exceeds limits, extract into:

1. **Sub-components**: UI pieces that can be reused
2. **Utility functions**: Logic that doesn't need React
3. **Custom hooks**: Stateful logic
4. **Types file**: TypeScript definitions

**Example Structure:**

```
src/components/system-monitor/
├── index.ts                    # Barrel export
├── system-monitor-dialog.tsx   # Main orchestrator
├── types.ts                    # Type definitions
├── utils.ts                    # Utility functions
├── dialog-header.tsx           # Header micro-component
├── metric-chart-card.tsx       # Reusable metric card
├── network-chart.tsx           # Network activity chart
├── app-list.tsx                # Applications list
├── app-list-item.tsx           # Single app item
└── connection-status.tsx       # Status indicator
```

### 4. Design Consistency with Design Tokens

**CRITICAL: Always use the design tokens from `src/components/ui/design-tokens.ts`**

All UI components MUST use the shared design tokens for consistency. Never hardcode styles.

#### Available Design Tokens

**Card Styles:**

```typescript
import { card } from "@/components/ui/design-tokens";

className={`${card.base} ${card.padding.md}`}
```

**Surface Styles (glass panels):**

```typescript
import { surface } from "@/components/ui/design-tokens";

// surface.panel - Glass panel style
// surface.panelInteractive - Interactive glass panel with hover effects
// surface.label - Surface label text
// surface.labelMuted - Muted surface label text
```

**Typography:**

```typescript
import { text } from "@/components/ui/design-tokens";

// text.label, text.labelUppercase, text.value, text.valueLarge,
// text.valueSmall, text.heading, text.headingLarge, text.headingXL,
// text.muted, text.subdued
```

**Colors:**

```typescript
import { colors } from "@/components/ui/design-tokens";

// colors.cpu = "#06b6d4"      (cyan)
// colors.memory = "#f59e0b"   (amber)
// colors.gpu = "#a855f7"      (purple)
// colors.storage = "#10b981"  (emerald)
// colors.network.upload = "#8b5cf6"
// colors.network.download = "#ec4899"
```

**Other tokens:** `button`, `statusDot`, `alert`, `iconBox`, `dialog`, `badge`, `input`, `progressBar`

**Utility functions:** `cn()` for combining classes, `getMetricColor()` for percentage-based coloring.

#### Design Token Usage Rules

1. **Always import from design-tokens.ts** - Never hardcode repeated styles
2. **Use template literals** - Combine tokens: `` `${card.base} ${card.padding.lg}` ``
3. **Extend, don't override** - Add classes after tokens: `` `${text.label} mb-2` ``
4. **Create new tokens** - If a pattern repeats 3+ times, add it to design-tokens.ts

### 5. Performance First (Low-Powered Devices)

**CRITICAL: This app runs on low-powered servers like Raspberry Pi 4**

All code MUST be optimized for limited CPU (4-core ARM), limited RAM (2-8 GB), and limited I/O bandwidth.

#### Key Performance Rules

- **Polling intervals**: >= 3000ms for data, >= 500ms for UI
- **History arrays**: Max 30-60 items, always use `.slice(-N)`
- **Memoization**: `useMemo` for computed values, `useCallback` for event handlers
- **Heavy components**: `dynamic()` import with `ssr: false`
- **Images**: Use Next.js `<Image>`, lazy loading
- **Animations**: CSS transforms over JS, `will-change` sparingly
- **Cleanup**: Always clean up subscriptions, intervals, event listeners in `useEffect` returns
- **AbortController**: Use for fetch requests
- **Real-time monitoring**: Use SSE/WebSocket, debounce 500ms minimum between re-renders
- **Chart data points**: 30 max for mini charts, 60 for full charts

#### Anti-Patterns to Avoid

| Anti-Pattern             | Solution                                 |
| ------------------------ | ---------------------------------------- |
| `useEffect` without deps | Add dependency array                     |
| Inline objects/arrays    | `useMemo` or move outside                |
| Polling < 1s             | Increase interval                        |
| Unbounded state arrays   | Use `.slice(-N)`                         |
| Heavy sync operations    | Use Web Workers or `requestIdleCallback` |
| Console.log in prod      | Remove or use debug flag                 |

## Development Commands

```bash
# Development (custom server with WebSocket support)
npm run dev              # Runs tsx server.ts on port 3000

# Building
npm run build            # Next.js production build
npm start                # Runs tsx server.ts in production mode

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix

# Testing
npm run test:unit        # Run Vitest unit tests

# Database
npm run db:init          # Run Prisma migrations

# App Store
npm run test-apps        # Test app store integration
```

**Note**: `npm run dev` and `npm start` both run `tsx server.ts`, a custom HTTP server that wraps Next.js and adds WebSocket support for the terminal and real-time system monitoring.

## Production Deployment

Installed via shell script to `/opt/homeio` and run as a systemd service:

- Supports pre-built releases (no compilation needed) or `--from-source` builds
- Configurable via `HOMEIO_HTTP_PORT` environment variable (default: 3000)
- Avahi/mDNS support for `.local` domain access

```bash
sudo systemctl [start|stop|restart] homeio
sudo systemctl status homeio
sudo journalctl -u homeio -f

# Update
cd /opt/homeio && sudo bash scripts/update.sh
```

## Project Architecture

### Source Directory

**All source code lives under `src/`.** The path alias `@/*` maps to `./src/*`.

### Folder Organization

```
homeio/
├── server.ts                     # Custom HTTP server (WebSocket + Next.js)
├── next.config.ts                # Next.js configuration
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma
│   └── migrations/
│
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Main dashboard
    │   ├── globals.css           # Global styles (Tailwind CSS 4)
    │   ├── login/                # Login page
    │   ├── setup/                # Initial setup page
    │   ├── external-apps/        # External app embedding
    │   ├── generated/            # Generated assets
    │   ├── actions/              # Server Actions (API layer)
    │   │   ├── system/           # System info, metrics, storage
    │   │   ├── filesystem/       # File manager, favorites, SMB, NFS
    │   │   ├── network/          # WiFi, firewall, Bluetooth
    │   │   ├── auth/             # Authentication, user settings
    │   │   ├── maintenance/      # Logger, updates, troubleshooting
    │   │   ├── docker/           # Docker operations (SOLID split)
    │   │   ├── docker.ts         # Docker barrel re-export
    │   │   ├── store/            # App store integrations
    │   │   │   ├── linuxserver-store.ts
    │   │   │   ├── linuxserver-helpers.ts
    │   │   │   └── types.ts
    │   │   ├── appstore.ts       # App store orchestrator
    │   │   └── internal-apps.ts  # Built-in apps
    │   └── api/                  # API Routes
    │       ├── auth/             # Auth endpoints
    │       ├── docker/           # Docker endpoints
    │       ├── external-apps/    # External app proxy
    │       ├── files/            # File download, view, upload, favorites
    │       └── system/           # System status endpoints
    │
    ├── modules/                  # Modular monolith feature modules
    │   ├── docker/               # Docker module
    │   ├── files/                # File management module
    │   ├── home/                 # Home dashboard module
    │   ├── monitoring/           # System monitoring module
    │   ├── settings/             # Settings module
    │   └── terminal/             # Terminal module
    │
    ├── core/                     # Cross-cutting concerns
    │   ├── auth.ts               # Authentication utilities
    │   ├── bus.ts                # Event bus system
    │   ├── permissions.ts        # Permission system
    │   ├── registry.ts           # Module registry
    │   ├── sse.ts                # SSE helpers
    │   └── index.ts              # Barrel export
    │
    ├── hooks/                    # Custom React hooks
    │   ├── system-status-types.ts
    │   ├── useRebootTracker.ts
    │   ├── useSystemStatus.ts    # WebSocket-based system status
    │   ├── useUserLocation.ts
    │   ├── useWeatherData.ts
    │   └── useWidgets.ts
    │
    ├── constants/                # Application constants
    │   └── index.ts              # Weather codes, humidity levels, etc.
    │
    ├── components/               # React components
    │   ├── ui/                   # shadcn/ui base components + design tokens
    │   │   └── design-tokens.ts  # CRITICAL: Shared design tokens
    │   ├── widgets/              # Dashboard widget system (15+ widget types)
    │   │   ├── widget-grid.tsx
    │   │   ├── widget-container.tsx
    │   │   ├── widget-selector.tsx
    │   │   ├── widget-checker.tsx
    │   │   ├── widget-section.tsx
    │   │   ├── widget-data-utils.ts
    │   │   ├── widget-data-utils.test.ts
    │   │   ├── constants.ts
    │   │   ├── types.ts
    │   │   ├── shared/           # Shared widget sub-components
    │   │   └── widgets/          # Individual widget implementations
    │   │       ├── custom.tsx
    │   │       ├── files-grid.tsx
    │   │       ├── files-list.tsx
    │   │       ├── four-stats.tsx
    │   │       ├── three-stats.tsx
    │   │       ├── two-stats-gauge.tsx
    │   │       ├── list-emoji.tsx
    │   │       ├── list-widget.tsx
    │   │       ├── network-stats.tsx
    │   │       ├── system-pills.tsx
    │   │       ├── text-with-buttons.tsx
    │   │       ├── text-with-progress.tsx
    │   │       ├── thermals.tsx
    │   │       └── weather.tsx
    │   ├── system-monitor/       # System monitoring (micro-components)
    │   ├── settings/             # Settings dialogs (micro-components)
    │   ├── lock-screen/          # Lock screen (micro-components)
    │   ├── terminal/             # Web terminal (xterm.js + node-pty)
    │   ├── auth/                 # Authentication UI
    │   ├── file-manager/         # File manager
    │   ├── app-store/            # App store UI
    │   ├── installed-apps/       # Installed apps management
    │   ├── system-status/        # System status widget
    │   ├── greeting-card/        # User greeting & clock
    │   ├── home/                 # Home page components
    │   ├── search/               # Search UI
    │   ├── keyboard-shortcuts/   # Keyboard shortcuts
    │   ├── icons/                # Custom icon components
    │   ├── system/               # System-level components
    │   ├── theme/                # Theme provider
    │   └── layout/               # Layout components
    │
    ├── lib/                      # Utility libraries
    │   ├── exec.ts               # Centralized execAsync / execFileAsync
    │   ├── json-store.ts         # Generic JSON file read/write helpers
    │   ├── prisma.ts             # Prisma client singleton
    │   ├── utils.ts              # General utilities
    │   ├── config.ts             # App configuration
    │   ├── auth-utils.ts         # Auth utility functions
    │   ├── fetchWeatherData.ts   # Weather data fetching
    │   ├── system-status/        # WebSocket server for real-time metrics
    │   └── terminal/             # WebSocket server for terminal
    │
    └── types/                    # TypeScript type definitions
```

### Modular Monolith Architecture (`src/modules/`)

Feature modules follow a consistent shape:

| File             | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `actions.ts`     | Server actions exposed by the module       |
| `domain.ts`      | Domain models/types                        |
| `service.ts`     | Pure business logic helpers                |
| `streams.ts`     | SSE/WebSocket/client stream adapters       |
| `components/`    | Feature-specific UI components             |
| `ui.tsx`         | Primary UI exports used by app shell       |
| `index.ts`       | Module barrel export                       |

**Rules:**
- Keep module internals private; import from `@/modules/<name>`
- Pure logic in `service.ts`, side effects in `actions.ts` and `streams.ts`
- Use `@/core` for cross-cutting concerns (auth, permissions, registry, event bus, SSE helpers)

### Custom Server (`server.ts`)

The app uses a custom HTTP server wrapping Next.js to support:

1. **Terminal WebSocket** - `node-pty` + `xterm.js` for host/container terminals (optional, gracefully fails if `node-pty` unavailable)
2. **System Status WebSocket** - Real-time system metrics broadcasting

Port configured via `HOMEIO_HTTP_PORT` or `PORT` env vars (default: 3000).

### Server Actions Pattern

Server Actions (`'use server'`) are the primary API layer, organized into domain folders under `src/app/actions/`:

- **`system/`**: System info, real-time metrics, storage
- **`filesystem/`**: File manager, favorites, SMB shares, network storage
- **`network/`**: WiFi, firewall, Bluetooth
- **`auth/`**: Authentication, user settings
- **`maintenance/`**: Logger, updates, troubleshooting
- **`docker/`**: Docker container management (SOLID split into: `backup.ts`, `db.ts`, `dependencies.ts`, `deploy.ts`, `health.ts`, `lifecycle.ts`, `query.ts`, `utils.ts`, `env/`)
- **`store/`**: App store integrations (LinuxServer.io)
- **`appstore.ts`**: App store orchestrator

Import from barrel files (e.g. `@/app/actions/system`) or specific files.

### Common Helpers (`src/lib/`)

- **`lib/exec.ts`**: Centralized `execAsync` and `execFileAsync` - import instead of defining `promisify(exec)` locally
- **`lib/json-store.ts`**: Generic `readJsonFile(path, fallback)` and `writeJsonFile(path, data, mode?)` - use for JSON config files
- **`lib/prisma.ts`**: Prisma client singleton
- **`lib/config.ts`**: Application configuration
- **`lib/auth-utils.ts`**: Auth utility functions

### Database (Prisma)

The app uses **Prisma** with support for both PostgreSQL and SQLite adapters:

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Initialize: `npm run db:init`
- Client singleton: `src/lib/prisma.ts`

### Authentication

PIN-based authentication system:

- Login page: `src/app/login/`
- Setup page: `src/app/setup/`
- Auth components: `src/components/auth/`
- Lock screen: `src/components/lock-screen/`
- Server actions: `src/app/actions/auth/`
- Password hashing: `bcryptjs`

### App Store

The app store supports API-based catalogs:

- **LinuxServer.io** - Community images

Store integration code in `src/app/actions/store/`. Docker operations use CLI commands via `exec` (not dockerode).

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Key Dependencies

| Package | Purpose |
| ------- | ------- |
| `next` (16) | React framework with App Router |
| `react` (19) | UI library |
| `tailwindcss` (4) | Utility-first CSS |
| `framer-motion` | Animation library |
| `lucide-react` | Icon library |
| `recharts` | Charting library |
| `@prisma/client` | Database ORM |
| `node-pty` | Terminal PTY (optional) |
| `xterm` + addons | Terminal UI |
| `ws` | WebSocket server |
| `systeminformation` | System metrics collection |
| `bcryptjs` | Password hashing |
| `sonner` | Toast notifications |
| `next-themes` | Theme management |
| `openmeteo` | Weather data API |
| `composerize` | Docker Compose converter |
| `@monaco-editor/react` | Code editor |
| `input-otp` | OTP/PIN input |
| `yaml` | YAML parsing |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Component variant utilities |
| `shadcn/ui` (Radix) | Base UI components |
| `vitest` | Unit testing framework |

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- JSX: react-jsx
- Module resolution: bundler
- Path aliases: `@/*` -> `./src/*`

## Styling System

- **Tailwind CSS 4** with `@theme inline` directive in `src/app/globals.css`
- Uses `tw-animate-css` for animation utilities
- Design tokens in `src/components/ui/design-tokens.ts`
- Dark mode via `next-themes`

**Standard Color Palette:**

- CPU: `#06b6d4` (cyan)
- Memory: `#f59e0b` (amber)
- GPU: `#a855f7` (purple)
- Storage: `#10b981` (emerald)
- Network Upload: `#8b5cf6` (violet)
- Network Download: `#ec4899` (pink)

## Platform Compatibility

### Production Platform: Debian LTS

**Primary Target**: Debian LTS - All system commands and operations are designed for Debian-based systems.

- **Debian LTS**: Full production support
- **macOS**: Development environment support
- **Ubuntu/Debian variants**: Should work with minimal changes
- **Windows**: Not supported (consider WSL2 for development only)

System monitoring primarily uses the `systeminformation` Node.js library (cross-platform) with fallback to Debian-compatible shell commands where needed.

### Required System Packages (Debian)

```bash
sudo apt update
sudo apt install -y \
  sysstat \           # mpstat, iostat, sar
  lm-sensors \        # Temperature monitoring
  net-tools \         # ifconfig, netstat
  iproute2 \          # ip command
  docker.io \         # Docker engine
  docker-compose      # Docker Compose
```

## Testing

- **Framework**: Vitest
- **Run**: `npm run test:unit`
- **Test files**: Co-located with source (e.g., `widget-data-utils.test.ts`)
- Also test interactively: responsive design, dark mode, Docker operations, memory leaks

## File Manager Module

### Features

- File browsing with history/breadcrumbs, grid/list views
- Create, rename, delete (soft), move, copy operations
- Text file editing (Monaco editor with syntax highlighting)
- Compression (tar.gz) and decompression (8 formats)
- SMB/NFS network storage mounting and SMB sharing
- Favorites, search, keyboard shortcuts (Cmd+X/C/V)
- File upload with drag-and-drop
- File preview: images, video, audio, PDF
- Path traversal protection, permission display
- Download via API routes

### File Manager Structure

```
src/components/file-manager/
├── files-dialog.tsx            # Main orchestrator
├── files-content.tsx           # Grid/list view
├── files-toolbar.tsx           # Navigation bar
├── files-sidebar.tsx           # Sidebar nav
├── file-editor-modal.tsx       # Monaco text editor
├── file-creation-row.tsx       # Inline create input
├── file-upload-zone.tsx        # Drag-and-drop upload
├── use-files-dialog.ts         # Main hook
├── use-file-navigation.ts     # Navigation hook
├── use-file-operations.ts     # File operations hook
├── use-file-editor.ts         # Editor hook
├── context-menu/               # Right-click menu system
├── file-viewer/                # Preview components
│   ├── file-viewer-dialog.tsx
│   ├── file-viewer-header.tsx
│   ├── file-viewer.tsx
│   ├── file-utils.ts
│   ├── image-viewer.tsx
│   ├── video-viewer.tsx
│   ├── audio-viewer.tsx
│   └── pdf-viewer.tsx
├── network-storage/            # Network storage management
├── network-storage-dialog.tsx
└── smb-share-dialog.tsx

src/app/actions/filesystem/     # Server actions
src/app/api/files/              # download, view, upload, favorites
```

### File Manager Performance Rules

- Directory listing: Max 50-100 visible items, virtualize for more
- Search debounce: >= 300ms delay
- File size limits: 1MB for text editor, streaming for downloads
- Icon loading: Static SVGs, no runtime generation
- Operations: Show loading states, abort on unmount

## Code Quality Standards

### When Writing Code

1. **Check component size** - Must be under 150 lines
2. **Use design tokens** - Import from `@/components/ui/design-tokens`
3. **Apply SOLID principles** - Single responsibility per component
4. **Keep it simple** - Prefer readability over cleverness
5. **Write TypeScript** - No implicit `any` types
6. **Use Server Actions** - Avoid creating API routes unless necessary
7. **Component composition** - Prefer composition over props drilling
8. **Error handling** - Always handle errors gracefully with user feedback
9. **Performance first** - Memoize, debounce, limit arrays, cleanup effects
10. **Optimize for Raspberry Pi** - Assume limited RAM, 4-core ARM CPU

### When Detecting Issues

**If component exceeds 150 lines**: Identify sub-components, extract into separate files, create `types.ts` and `utils.ts`.

**If you detect design inconsistencies**: Replace hardcoded styles with design tokens. If no token exists, add one to `design-tokens.ts`.

**If you detect SOLID violations**: Refactor and explain the fix.

**If you detect unnecessary complexity**: Simplify following KISS.

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/feature-name`
- Commit messages: Clear and descriptive
- No force pushes to main

## Quick Reference: Component Refactoring Checklist

- [ ] Component under 150 lines?
- [ ] Using design tokens from `design-tokens.ts`?
- [ ] Types extracted to `types.ts`?
- [ ] Utility functions in `utils.ts`?
- [ ] Barrel export in `index.ts`?
- [ ] Sub-components properly extracted?
- [ ] Consistent with existing patterns?

## Reference Components

**Best Examples of Micro-Component Architecture:**

1. `src/components/system-monitor/` - Full dialog with micro-components
2. `src/components/settings/tabs/` - 7 tab components, each focused
3. `src/components/lock-screen/` - Simple 3-component structure
4. `src/components/widgets/shared/` - Reusable widget sub-components
5. `src/components/file-manager/file-viewer/` - Viewer with clean separation
