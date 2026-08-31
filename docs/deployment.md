# Deployment

## Requisitos

Node 20+, Postgres 15 o SQLite para dev.

## Instalación limpia

```bash
npm ci
npm run build
# frontend
cd frontend && npm ci && npm run build
```

## Migraciones

TypeORM synchronize true en sqlite; en postgres correr migraciones dist/infrastructure/database/migrations/*.js

## Variables

Ver .env.example — incluir VERIFY_BASE_URL, JWT secrets, DB.

## Flags

STICKER_ENABLED / VERIFY_ENABLED (si se deshabilitan retornar 404).

## Health

GET /health, GET /api/v1/verify/:folio público.
```

