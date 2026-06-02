"use client";

import { useEffect, useState } from "react";
import type { PublicGalleryPayload } from "@/lib/types";
import styles from "./public.module.css";

export default function PublicGalleryClient({ gallery }: { gallery: PublicGalleryPayload }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowRight") {
        setLightboxIndex((current) => current === null ? null : Math.min(gallery.photos.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) => current === null ? null : Math.max(0, current - 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery.photos.length, lightboxIndex]);

  async function downloadPhoto(photoId: string, filename: string) {
    const response = await fetch(`/api/photos/${photoId}/presign?accessKey=${encodeURIComponent(gallery.accessKey)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (data.url) {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = filename;
      link.click();
    }
  }

  const activePhoto = lightboxIndex === null ? null : gallery.photos[lightboxIndex];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>{gallery.previewMode ? "Admin Preview" : "Private Client Gallery"}</span>
        <h1>{gallery.title}</h1>
        {gallery.clientName ? <p>{gallery.clientName}</p> : null}
        {gallery.description ? <div className={styles.description}>{gallery.description}</div> : null}
      </section>

      <section className={styles.grid}>
        {gallery.photos.map((photo, index) => (
          <button key={photo.id} className={styles.tile} onClick={() => setLightboxIndex(index)}>
            <img src={photo.previewUrl || ""} alt={photo.filename} className={styles.tileImage} loading="lazy" />
            <div className={styles.tileMeta}>
              <strong>{photo.filename}</strong>
              <span>{photo.folderPath || "Gallery"}</span>
            </div>
          </button>
        ))}
      </section>

      {activePhoto ? (
        <div className={styles.lightbox} onClick={(event) => {
          if (event.target === event.currentTarget) setLightboxIndex(null);
        }}>
          <button className={styles.close} onClick={() => setLightboxIndex(null)}>Close</button>
          <button className={styles.nav} onClick={() => setLightboxIndex((current) => current === null ? null : Math.max(0, current - 1))}>Prev</button>
          <div className={styles.lightboxContent}>
            <img src={activePhoto.previewUrl || ""} alt={activePhoto.filename} className={styles.lightboxImage} />
            <div className={styles.lightboxMeta}>
              <div>
                <strong>{activePhoto.filename}</strong>
                <span>{activePhoto.folderPath || "Gallery"}</span>
              </div>
              {gallery.allowDownload ? (
                <button className={styles.download} onClick={() => downloadPhoto(activePhoto.id, activePhoto.filename)}>
                  Download Original
                </button>
              ) : null}
            </div>
          </div>
          <button className={styles.nav} onClick={() => setLightboxIndex((current) => current === null ? null : Math.min(gallery.photos.length - 1, current + 1))}>Next</button>
        </div>
      ) : null}
    </main>
  );
}
