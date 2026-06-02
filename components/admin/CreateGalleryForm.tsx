"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function CreateGalleryForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    description: "",
    status: "DRAFT",
    allowDownload: true,
    expiresAt: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSubmitting(false);
      setError(data.error || "Unable to create gallery");
      return;
    }

    router.push(`/admin/galleries/${data.gallery.id}`);
    router.refresh();
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.kicker}>New Gallery</span>
          <h1>Create a client gallery</h1>
          <p>Set the title, client metadata, publication state, and delivery rules.</p>
        </div>
      </div>

      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Gallery title</span>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label className={styles.field}>
          <span>Client name</span>
          <input value={form.clientName} onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))} />
        </label>
        <label className={styles.field}>
          <span>Client email</span>
          <input type="email" value={form.clientEmail} onChange={(event) => setForm((current) => ({ ...current, clientEmail: event.target.value }))} />
        </label>
        <label className={styles.field}>
          <span>Status</span>
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Expires at</span>
          <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} />
        </label>
        <label className={styles.checkboxField}>
          <input type="checkbox" checked={form.allowDownload} onChange={(event) => setForm((current) => ({ ...current, allowDownload: event.target.checked }))} />
          <span>Allow client downloads</span>
        </label>
        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span>Description</span>
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} />
        </label>

        {error ? <div className={`${styles.errorBanner} ${styles.fieldFull}`}>{error}</div> : null}

        <div className={`${styles.formActions} ${styles.fieldFull}`}>
          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? "Creating..." : "Create Gallery"}
          </button>
        </div>
      </form>
    </section>
  );
}
