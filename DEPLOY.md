# Vercel + Turso Deployment

## 1. Create a Turso database

```bash
# Install Turso CLI
curl -fsSL https://turso.tech/install.sh | bash

# Authenticate (creates free account at turso.tech)
turso auth login

# Create database
turso db create b2-photo-gallery

# Get the connection URL
turso db show b2-photo-gallery --url
```

The URL looks like: `libsql://b2-photo-gallery-xxxx.turso.io?authToken=...`

## 2. Deploy to Vercel

```bash
cd b2-photo-gallery
npx vercel --prod
```

When prompted, set these environment variables:

| Variable | Value |
|---|---|
| `B2_APPLICATION_KEY_ID` | From Backblaze B2 → App Keys |
| `B2_APPLICATION_KEY` | From Backblaze B2 → App Keys |
| `B2_BUCKET_NAME` | Your bucket name |
| `B2_ENDPOINT` | e.g. `s3.us-west-000.backblazeb2.com` |
| `B2_REGION` | e.g. `us-west-000` |
| `DATABASE_URL` | Turso URL from step 1 |

Or link via Vercel dashboard → Project → Settings → Environment Variables.

## 3. Migrate the database

```bash
# Run migrations against the remote Turso DB
DATABASE_URL="libsql://..." npx prisma migrate deploy
```

## 4. First scan

Open your Vercel URL, then trigger **Rescan Backblaze** to index all images into Turso.

## Troubleshooting

**Migration fails**: Make sure `DATABASE_URL` is set before running migrate.

**No images after scan**: Check that `B2_BUCKET_NAME`, `B2_ENDPOINT`, and credentials are correct in Vercel env vars.

**Slow thumbnails**: Thumbnails are generated on-demand per image, streamed from B2 through Sharp. First view generates; subsequent views serve instantly.