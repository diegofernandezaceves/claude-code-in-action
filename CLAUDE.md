# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # Initial setup: install deps + Prisma generate + migrate
npm run dev          # Dev server with Turbopack
npm run dev:daemon   # Dev server in background, logs to logs.txt
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run Vitest (all tests)
npm test -- path/to/test  # Run a single test file
npm run db:reset     # Reset SQLite database
```

Set `ANTHROPIC_API_KEY` in `.env`. Without it, the app uses a mock provider that returns static placeholder components.

## Architecture

UIGen is a Next.js 15 App Router app where users describe React components in a chat interface and Claude generates them in real-time with live preview.

### Three-Panel Layout
`src/app/main-content.tsx` orchestrates the resizable layout:
- **Left panel**: Chat interface (messages + input)
- **Right panel**: Tabbed Preview (iframe) / Code (Monaco editor + file tree)

### Core Data Flow
1. User message → `ChatContext` → POST `/api/chat`
2. API route reconstructs `VirtualFileSystem` from serialized state in request body
3. Claude streams responses and calls tools (`str_replace_editor`, `file_manager`) to modify the virtual file system
4. Tool call results flow back through `FileSystemContext` to update UI state
5. `PreviewFrame` detects changes, uses Babel standalone to transpile JSX, injects an import map pointing to esm.sh CDN for React 19 + dependencies, and renders in a sandboxed iframe

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`): In-memory file tree. All "files" exist only in memory; never written to disk. Serialized to JSON for persistence and API transport.

**FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): React wrapper around VirtualFileSystem. Executes AI tool calls and triggers UI refresh.

**ChatContext** (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat` hook. Serializes file system state into every API request. Tracks anonymous usage in localStorage.

**Chat API Route** (`src/app/api/chat/route.ts`): Streaming endpoint using `streamText`. On completion, persists project to Prisma DB (authenticated users only). Max 10,000 tokens / 40 tool steps.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Babel transforms all files, strips CSS imports, generates import map with esm.sh CDN URLs, and produces self-contained HTML for the iframe.

### AI Tools Available to Claude
- `str_replace_editor`: view/create/str_replace/insert operations on virtual files
- `file_manager`: rename/delete operations on virtual files

The system prompt (`src/lib/prompts/generation.tsx`) requires Claude to always create `/App.jsx` as the entry point, use Tailwind CSS, and use `@/` alias for inter-file imports.

### Auth
JWT tokens (jose) in httpOnly cookies, 7-day sessions, bcrypt passwords. Server actions in `src/actions/`. Middleware at `src/middleware.ts` validates sessions.

### Database
Prisma + SQLite. Schema defined in `prisma/schema.prisma`. `Project.data` stores serialized VirtualFileSystem JSON. `Project.messages` stores chat history JSON. Anonymous projects have `userId = null`.

## Path Aliases
`@/` maps to `src/` throughout the codebase (configured in `tsconfig.json` and `vitest.config.mts`).

## Testing
Vitest with jsdom and `@testing-library/react`. Tests live in `__tests__/` subdirectories alongside source files.

## Code Style
Use comments sparingly. Only comment complex code.
