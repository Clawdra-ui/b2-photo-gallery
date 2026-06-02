export const dynamic = "force-dynamic";

import AdminShell from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin";

export default async function SettingsPage() {
  await requireAdminPage();

  return (
    <AdminShell active="settings">
      <section>
        <h1>Settings</h1>
        <p>
          Configure environment variables through `.env` locally and the Vercel project settings in production.
        </p>
        <div className="panel-grid">
          <div className="panel-card">
            <h2>Public App URL</h2>
            <p>{process.env.PUBLIC_APP_URL || "http://localhost:3000"}</p>
          </div>
          <div className="panel-card">
            <h2>Gallery Prefix Root</h2>
            <p>{process.env.CLIENT_GALLERY_PREFIX || "client-galleries"}</p>
          </div>
          <div className="panel-card">
            <h2>Presigned URL TTL</h2>
            <p>{process.env.PRESIGNED_URL_EXPIRES_SECONDS || "600"} seconds</p>
          </div>
          <div className="panel-card">
            <h2>Production DB</h2>
            <p>Use a PostgreSQL `DATABASE_URL` on Vercel. Local Docker Postgres is supported for development.</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
