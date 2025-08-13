# GymStack — Full-Stack Gym Management Starter

This repo is a **production-ready scaffold** for the Gym Application you described.
It includes:
- **Admin Web** (React + TypeScript + Vite + Tailwind)
- **Member App** (React PWA skeleton)
- **API Service** (Express + TypeScript + Zod + Mongoose)
- **Worker Service** (BullMQ for reminders and alerts)

> Created: 2025-08-12

## Quick Start

```bash
# 1) Use Node 20+
# 2) Install deps (root workspaces)
npm install

# 3) Environment (copy and edit)
cp .env.example .env
cp services/api/.env.example services/api/.env

# 4) Run all (dev)
npm run dev

# Individual
npm run dev:api
npm run dev:admin
npm run dev:member
npm run dev:worker
```

## Tech
- Workspaces via npm
- TypeScript project refs
- ESLint + Prettier (minimal)
- MongoDB + Mongoose models for core entities
- Zod request validation
- JWT auth & role-based middleware
- Basic routes implemented: **users**, **packs**, **memberships**, **payments**, **attendance**, **reports** (sample)
