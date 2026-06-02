# B2 Photo Gallery

Private Backblaze B2 photo preview web app built with Next.js + TypeScript.

## Features

- Browse JPG/JPEG photos from a private Backblaze B2 bucket via S3-compatible API
- Server-side indexing with SQLite (Prisma + Turso) — credentials never exposed to browser
- Server-side thumbnail generation (400px WebP) via Sharp
- Short-lived presigned URLs (10 min) for secure image previews
- Folder tree navigation, filename search, delivery-folder filter
- Sort by newest, oldest, name, or size
- Lightbox with keyboard navigation, download, and copy-path
- Masonry grid with lazy loading and virtualized rendering for large collections

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure credentials
cp .env.example .env
# Edit .env with your Backblaze B2 credentials

# 3. Initialize the database
npx prisma migrate dev

# 4. Run the dev server
npm run dev
```

Then open http://localhost:3000 and click **Rescan Backblaze** to index your bucket.

## .env required variables

```env
# Backblaze B2
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name
B2_ENDPOINT=s3.us-west-000.backblazeb2.com
B2_REGION=us-west-000

# Database (local dev: SQLite, production: Turso)
DATABASE_URL=file:./dev.db
```

For production on Vercel with Turso:

```bash
# Create a Turso database
brew install turso   # or: curl -fsSL https://turso.tech/install.sh | bash
turso db create b2-photo-gallery
turso db show b2-photo-gallery --url   # → DATABASE_URL
```

Then set these environment variables in Vercel:

| Variable | Value |
|---|---|
| `B2_APPLICATION_KEY_ID` | From Backblaze B2 dashboard |
| `B2_APPLICATION_KEY` | From Backblaze B2 dashboard |
| `B2_BUCKET_NAME` | Your bucket name |
| `B2_ENDPOINT` | e.g. `s3.us-west-000.backblazeb2.com` |
| `B2_REGION` | e.g. `us-west-000` |
| `DATABASE_URL` | Turso database URL from `turso db show` |

Deploy:

```bash
npm i -g vercel
vercel
```

## Project structure

```
app/
  api/
    scan/         POST — scan B2 bucket, index files into SQLite
    files/        GET — paginated, filtered file list
    folders/      GET — all unique folder paths
    presign/[key] GET — generate 10-min presigned GET URL
    thumb/[id]    GET — stream thumbnail from B2
  layout.tsx
  page.tsx
components/
  Gallery.tsx      — main layout, state management
  Toolbar.tsx      — top bar with search, sort, scan button
  FolderTree.tsx   — left sidebar folder hierarchy
  PhotoGrid.tsx    — masonry grid with lazy loading
  Lightbox.tsx     — full-screen preview with nav
lib/
  prisma.ts        — Prisma client with Turso adapter
  s3.ts            — B2 S3 client, listAllObjects, generatePresignedUrl
  thumbnails.ts    — sharp-based thumb streaming
  utils.ts         — folder tree builder, validators, formatters
prisma/
  schema.prisma    — IndexedFile model
```

## Safety

- Object keys validated against a strict allowlist pattern — no path traversal
- All B2 communication is server-side only; credentials are never sent to the browser
- Presigned URLs expire after 10 minutes
- Pagination prevents loading all files at once
- Thumbnails use lazy loading and incremental visibility expansion