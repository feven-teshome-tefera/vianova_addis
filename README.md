# Via Nova Addis

A full-stack shopping site and multi-platform publishing admin for Via Nova Addis. Products created in the central catalog power the public storefront, cart, checkout, order management, and independent publishing to the website, Telegram, Instagram, and TikTok.

## Architecture

```text
Admin UI → Next.js API → PostgreSQL (source of truth)
                         ↓
                   Publishing service
                         ↓
              Independent publication jobs
           ↙ Website  Telegram  Instagram  TikTok ↘
```

This is a modular monolith: product, media, and publishing modules share one deployment but have explicit boundaries. Each selected platform gets its own `Publication` record. Jobs are processed with `Promise.allSettled`, so one failure cannot roll back another destination. `PublishingAdapter` isolates platform APIs. For higher volume, replace the internal dispatcher in `src/services/publishing/service.ts` with BullMQ/Redis and run `processPublication` in a worker.

## Local development

Requirements: Node.js 20+, npm, Docker (or PostgreSQL 14+).

```bash
cp .env.example .env
docker compose up -d db
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000/admin`. Production: `npm run build && npm start`.

## Commands

- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm run typecheck` — strict TypeScript check
- `npm test` — business-logic tests
- `npm run build` — production build
- `npm run db:migrate` — create/apply development migrations
- `npm run db:seed` — realistic catalog and publication data
- `npm run db:studio` — Prisma Studio

## Environment

`DATABASE_URL` is required. Website publishing works without third-party credentials. Telegram requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID`. Instagram requires `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_ACCOUNT_ID`. TikTok requires `TIKTOK_ACCESS_TOKEN` and an attached video. Missing credentials produce persisted failed publications—success is never simulated.

Media uses a local `public/uploads` storage adapter endpoint in development. Move its interface to S3, R2, Cloudinary, or Supabase before horizontally scaled deployment; product records store URLs, never blobs.

## Routes

Storefront pages: `/`, `/shop`, `/shop/[slug]`, `/checkout`, `/about`, `/contact`.

Admin pages: `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/orders`, `/admin/orders/[id]`, `/admin/publishing`, `/admin/media`, `/admin/integrations`, `/admin/settings`.

Public API: `GET /api/products`, `GET /api/products/[id]` (published and in-stock only), `POST /api/cart/validate`, and `POST /api/orders`.

Admin API: `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/[id]`, `POST /api/admin/products/[id]/publish`, `POST /api/admin/products/[id]/schedule`, `POST /api/admin/publications/[id]/retry`, `POST /api/admin/media`.

## Security and deployment

No credentials are exposed to client components. `src/middleware.ts` is the authentication boundary; connect Auth.js and replace its pass-through before production. Configure a persistent/object storage adapter, a durable job queue, backups, and platform OAuth/token refresh for production. The application has no provider-specific deployment coupling.
