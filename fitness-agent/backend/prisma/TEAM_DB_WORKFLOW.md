# Team Database Workflow

This project uses Prisma as the shared source of truth for PostgreSQL schema changes.

## Current architecture after legacy cleanup

The project now uses this runtime data flow:

- PostgreSQL
- Prisma
- NestJS controllers and services
- frontend `lib/api.ts`
- frontend pages

The old static frontend exercise-data pipeline has been retired.

That means these legacy items should not be used as the source of truth anymore:

- `frontend/data/**`
- `frontend/scripts/generate-exercise-catalog.mjs`
- manual SQL bootstrap files outside committed migrations

The important active runtime files are:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/prisma/seed.mjs`
- `backend/src/store/app-store.service.ts`
- `backend/src/controllers/**`
- `frontend/lib/api.ts`

Do not delete `backend/src/store/app-store.service.ts`.
It is not legacy. It is the backend service layer that reads and writes PostgreSQL through Prisma and is required by the controllers.

## What must be shared in Git

Every teammate should share and review these files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/prisma/seed.mjs`
- `.env.example`

Do not share:

- your local PostgreSQL data folder
- your local `.env`
- your machine-specific passwords
- random manual changes applied only through pgAdmin or `psql`

## What Prisma migration means

A Prisma migration is a committed, ordered SQL change set generated from `schema.prisma`.

That means:

- one teammate changes `schema.prisma`
- that teammate creates a migration
- the migration is committed to Git
- other teammates pull the repo and apply the same migration

This is much safer than everyone manually editing their own local database.

## Why this reduces team conflicts

Prisma migrations reduce conflicts because the schema history lives in Git instead of only inside someone's local PostgreSQL instance.

It helps by making sure:

- the schema is reproducible on every machine
- changes are reviewed as code
- teammates apply the same ordered upgrade steps
- the remote environment can be upgraded using the same migration history

It does **not** mean there will never be conflicts. If two teammates change the schema at the same time, Git can still conflict in:

- `schema.prisma`
- migration folders

But this is still much easier to fix than trying to merge different manual database states.

## First-time local setup

1. Install PostgreSQL locally.
2. Create a database, for example `health_agent`.
3. Copy `.env.example` to `.env`.
4. Set `DATABASE_URL` to your own local PostgreSQL connection string.
5. From the project root, run:

```bash
npm run db:init
```

What `db:init` does:

- generates the Prisma client
- applies committed migrations
- loads the shared demo seed data

## Commands teammates should use

Run these from the project root:

```bash
npm run db:init
```

Initialize a fresh local database.

```bash
npm run db:seed
```

Reload shared demo data.

```bash
npm run db:migrate:deploy
```

Apply committed migrations without creating new ones. Use this after pulling new code.

```bash
npm run db:migrate:status
```

Check whether your database is up to date with the committed migration history.

```bash
npm run db:migrate:resolve:init
```

Mark the committed baseline migration as already applied. Use this one time only if you already created the schema manually before the migration system was added.

```bash
npm run db:reset
```

Drop and recreate the local database schema, then rerun seeds. Use this only for local development when you are okay losing local data.

```bash
npm run db:studio
```

Open Prisma Studio to inspect data in a table UI.

## How a teammate should make a schema change

When a teammate needs to change the database schema:

1. Edit `backend/prisma/schema.prisma`.
2. Run:

```bash
npm run db:migrate:dev -- --name your_change_name
```

3. Review the generated migration SQL.
4. If needed, update `backend/prisma/seed.mjs`.
5. Commit:

- `schema.prisma`
- the new migration folder
- any seed updates

6. Push and open a PR.

## How other teammates sync after pulling

After pulling the latest code:

```bash
npm run db:migrate:deploy
```

If the shared seed data changed and you want the same demo dataset:

```bash
npm run db:seed
```

If your local database got messy during development:

```bash
npm run db:reset
```

## If someone already has an old manually created local DB

This project originally had a manually bootstrapped PostgreSQL schema before committed Prisma migrations were added.

If a teammate already has that old local database:

1. Make sure their schema matches the current committed schema.
2. Run:

```bash
npm run db:migrate:resolve:init
```

3. Then run:

```bash
npm run db:seed
```

If their local DB is disposable, the cleaner option is:

```bash
npm run db:reset
```

or simply recreate the database and run:

```bash
npm run db:init
```

## Local DB vs remote DB

Use this rule:

- local development: `prisma migrate dev` only for the teammate actively creating a schema change
- teammate machines after pull: `prisma migrate deploy`
- shared remote/staging/production database: `prisma migrate deploy`

Do **not** use `migrate dev` on the remote shared environment.

## Seed data policy

Use `seed.mjs` for:

- demo user
- demo profile
- demo plan
- demo logs
- exercise catalog

Do not treat seeds as live collaborative team data. Seeds are for reproducible local setup and demo content.

## Important team rule

Never treat local manual DB edits as the source of truth.

If a schema change matters to the project, it must end up in:

- `schema.prisma`
- a committed migration

Otherwise other teammates cannot reproduce it reliably.

If application behavior changes because the backend needs different database reads or writes, update the service/controller code in Git as well.
Database consistency is not only schema consistency. The runtime query layer also needs to stay shared and reviewable.
