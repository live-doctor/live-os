# Modular Monolith Layout

Each feature module should keep the same shape:

- `actions.ts` - server actions exposed by the module
- `domain.ts` - domain models/types
- `service.ts` - pure business logic helpers
- `streams.ts` - SSE/WebSocket/client stream adapters
- `components/` - feature-specific UI components
- `ui.tsx` - primary UI exports used by app shell
- `index.ts` - module barrel

Rules:

- Keep module internals private when possible; import from `@/modules/<name>`.
- Prefer pure logic in `service.ts` and keep side effects in `actions.ts` and `streams.ts`.
- Use `@/core` for cross-cutting concerns (auth, permissions, registry, event bus, SSE helpers).
