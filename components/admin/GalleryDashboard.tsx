"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryListItem } from "@/lib/types";
import styles from "./admin.module.css";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "None";
}

export default function GalleryDashboard({ galleries }: { galleries: GalleryListItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
  }

  async function archiveGallery(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/galleries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function deleteGallery(id: string) {
    if (!window.confirm("Delete this gallery record? Existing B2 files will remain untouched.")) {
      return;
    }

    setBusyId(id);
    await fetch(`/api/admin/galleries/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.kicker}>Dashboard</span>
          <h1>All galleries</h1>
          <p>Each gallery gets a unique access key and isolated photo registry.</p>
        </div>
        <Link href="/admin/galleries/new" className={styles.primaryLink}>Create Gallery</Link>
      </div>

      <div className={styles.cardGrid}>
        {galleries.map((gallery) => (
          <article key={gallery.id} className={styles.galleryCard}>
            <div className={styles.galleryCardTop}>
              <div>
                <span className={styles.statusPill} data-status={gallery.status.toLowerCase()}>
                  {gallery.status.toLowerCase()}
                </span>
                <h2>{gallery.title}</h2>
                <p>{gallery.clientName || "No client name"}</p>
              </div>
              <div className={styles.metaStack}>
                <span>{gallery.photoCount} photos</span>
                <span>Created {formatDate(gallery.createdAt)}</span>
                <span>Expires {formatDate(gallery.expiresAt)}</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button className={styles.ghostButton} onClick={() => copyLink(gallery.publicUrl)}>Copy Link</button>
              <Link href={`/g/${gallery.accessKey}?preview=1`} className={styles.ghostLink} target="_blank">Preview</Link>
              <Link href={`/admin/galleries/${gallery.id}`} className={styles.primaryLink}>Manage</Link>
            </div>

            <div className={styles.cardActions}>
              <button className={styles.subtleButton} onClick={() => archiveGallery(gallery.id)} disabled={busyId === gallery.id}>Archive</button>
              <button className={styles.dangerButton} onClick={() => deleteGallery(gallery.id)} disabled={busyId === gallery.id}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
