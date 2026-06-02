"use client";

import { useEffect, useCallback, useState } from "react";
import styles from "./Lightbox.module.css";
import { IndexedFile } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";

interface LightboxProps {
  file: IndexedFile;
  files: IndexedFile[];
  index: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

export default function Lightbox({ file, files, index, onClose, onNavigate }: LightboxProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setImageUrl(null);
    const encodedKey = encodeURIComponent(file.objectKey);
    fetch(`/api/presign/${encodedKey}`)
      .then((r) => r.json())
      .then((data) => {
        setImageUrl(data.url);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [file.objectKey]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNavigate("next");
      else if (e.key === "ArrowLeft") onNavigate("prev");
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onNavigate, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = file.filename;
      a.click();
    }
  };

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(file.objectKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canPrev = index > 0;
  const canNext = index < files.length - 1;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <button className={styles.close} onClick={onClose}>✕</button>

      <div className={styles.nav}>
        <button
          className={styles.navBtn}
          onClick={() => onNavigate("prev")}
          disabled={!canPrev}
        >
          ‹
        </button>
        <button
          className={styles.navBtn}
          onClick={() => onNavigate("next")}
          disabled={!canNext}
        >
          ›
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loader}><div className={styles.spinner} /></div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={file.filename} className={styles.image} />
        ) : (
          <div className={styles.error}>Failed to load image</div>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.metaLeft}>
          <span className={styles.filename}>{file.filename}</span>
          <span className={styles.path}>{file.objectKey}</span>
        </div>
        <div className={styles.metaRight}>
          <span className={styles.size}>{formatFileSize(file.size)}</span>
          <button className={styles.actionBtn} onClick={handleCopyPath}>
            {copied ? "Copied!" : "Copy path"}
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleDownload}
            disabled={!imageUrl}
          >
            Download
          </button>
        </div>
      </div>

      <div className={styles.counter}>
        {index + 1} / {files.length}
      </div>
    </div>
  );
}