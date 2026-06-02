"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./PhotoGrid.module.css";
import { IndexedFile } from "@/lib/types";

interface PhotoGridProps {
  files: IndexedFile[];
  loading: boolean;
  lightboxIndex: number;
  onFileClick: (file: IndexedFile, index: number) => void;
}

export default function PhotoGrid({ files, loading, lightboxIndex, onFileClick }: PhotoGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleCount, setVisibleCount] = useState(48);

  const handleImageLoad = useCallback((index: number) => {
    if (index >= visibleCount - 8) {
      setVisibleCount((v) => Math.min(files.length, v + 24));
    }
  }, [visibleCount, files.length]);

  if (loading && files.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading gallery...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={styles.empty}>
        <span>No images found</span>
        <p>Run a scan to index your B2 bucket</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {files.slice(0, visibleCount).map((file, index) => (
        <div
          key={file.id}
          className={`${styles.cell} ${index === lightboxIndex ? styles.active : ""}`}
          onClick={() => onFileClick(file, index)}
        >
          <div className={styles.imgWrap}>
            <img
              src={`/api/thumb/${file.id}`}
              alt={file.filename}
              className={styles.img}
              loading="lazy"
              decoding="async"
              onLoad={() => handleImageLoad(index)}
            />
          </div>
          <div className={styles.info}>
            <span className={styles.filename}>{file.filename}</span>
          </div>
        </div>
      ))}
      {loading && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
}