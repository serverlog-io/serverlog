# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Serverlog is an open-source real-time event tracking and analytics platform. It's organized as an npm workspaces monorepo with a Node.js/Express backend and a Next.js frontend.

## Monorepo Structure

```
/
├── apps/
│   ├── backend/    # Express + Prisma + Socket.IO
│   └── frontend/   # Next.js + React
├── package.json    # Workspaces config
└── docker-compose.yml
```

## Common Commands

### From Root (recommended)
```bash
npm install          # Install all workspace dependencies
npm run dev          # Run both backend and frontend
npm run dev:backend  # Run only backend (port 3010)
npm run dev:frontend # Run only frontend (port 3011)
npm run build        # Build frontend
npm run test         # Run backend tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run seed         # Seed database
```

### Docker
```bash
docker-compose up -d  # Start PostgreSQL and backend containers
```

## Architecture

### Backend (apps/backend/)
- **app.js**: Main entry point - Express server with Socket.IO for real-time events
- **src/modules/**: Feature modules following controller → service → Prisma pattern
  - `users/`, `projects/`, `channels/`, `events/`, `insights/`, `apiKeys/`, `identify/`
  - `publicApi/`: Public REST API (`/v1/log`, `/v1/identify`, `/v1/insight`)
- **src/core/libs/**: Shared utilities (database, logger, JWT, errors, socket)
- **src/middlewares/**: Auth, admin, API key validation, error handling, Zod validation
- **prisma/**: Database schema

### Module Aliases (Backend)
Configured in `apps/backend/package.json` `_moduleAliases`:
- `@core` → src/core
- `@libs` → src/core/libs
- `@middlewares` → src/middlewares
- `@modules` → src/modules
- `@utils` → src/utils

### Frontend (apps/frontend/)
- **src/pages/**: Route pages (Next.js Pages Router)
- **src/components/**: UI components including events panel with real-time updates
- **src/api/**: API client modules
- **src/contexts/**: React contexts (auth)
- **src/hooks/**: Custom hooks (useSocket for real-time)
- Uses Tailwind CSS v4, Radix UI, and shadcn/ui patterns

### Database
PostgreSQL with Prisma ORM. Core models: User, Project, Channel, Event, Insight, ApiKey, UserProfile.

### Real-time
Socket.IO enables live event streaming. Backend emits to project rooms; frontend subscribes via useSocket hook.

### Public API Authentication
Uses API keys (Bearer token) validated via `apiKeyMiddleware`. Keys are hashed with bcrypt.

## Testing

Tests are in `apps/backend/__tests__/` using Jest and Supertest. Run a single test file:
```bash
npm run test -- --testPathPattern=users.test.js
```

## Instructions

- After each code edit, pause and reflect: Is this implementation the most correct approach? Consider alternatives, edge cases, and potential improvements before moving on.
