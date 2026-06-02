"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./Gallery.module.css";
import { IndexedFile, FileFilter } from "@/lib/types";
import FolderTree from "./FolderTree";
import PhotoGrid from "./PhotoGrid";
import Toolbar from "./Toolbar";
import Lightbox from "./Lightbox";

interface ScanStatus {
  total: number;
  lastScan: string | null;
}

interface TestResult {
  success: boolean;
  bucket?: string;
  endpoint?: string;
  region?: string;
  objectCount?: number;
  error?: string;
}

export default function Gallery() {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(48);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const [filter, setFilter] = useState<FileFilter>({
    sortBy: "newest",
    deliveryOnly: false,
  });

  const [lightboxFile, setLightboxFile] = useState<IndexedFile | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      setFolders(data.folders || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchFiles = useCallback(async (filters: FileFilter, pageNum: number) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(pageSize),
        sortBy: filters.sortBy || "newest",
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.folder) params.set("folder", filters.folder);
      if (filters.deliveryOnly) params.set("deliveryOnly", "true");

      const res = await fetch(`/api/files?${params}`);
      const data = await res.json();
      setFiles(data.files || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const fetchScanStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scan");
      const data = await res.json();
      setScanStatus(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFolders();
    fetchScanStatus();
  }, [fetchFolders, fetchScanStatus]);

  useEffect(() => {
    fetchFiles(filter, page);
  }, [filter, page, fetchFiles]);

  const handleTestB2 = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-b2");
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, error: data.error || "Scan failed" });
      }
      await fetchScanStatus();
      await fetchFiles(filter, 1);
      setPage(1);
    } finally {
      setScanning(false);
    }
  }, [filter, fetchFiles, fetchScanStatus]);

  const openLightbox = useCallback((file: IndexedFile, index: number) => {
    setLightboxFile(file);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxFile(null);
  }, []);

  const navigateLightbox = useCallback((direction: "prev" | "next") => {
    const newIndex = lightboxIndex + (direction === "next" ? 1 : -1);
    if (newIndex >= 0 && newIndex < files.length) {
      setLightboxIndex(newIndex);
      setLightboxFile(files[newIndex]);
    }
  }, [lightboxIndex, files]);

  return (
    <div className={styles.layout}>
      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        onScan={handleScan}
        scanning={scanning}
        scanStatus={scanStatus}
        total={total}
      />

      {testResult && (
        <div className={`${styles.alert} ${testResult.success ? styles.alertSuccess : styles.alertError}`}>
          {testResult.success ? (
            <>
              <strong>Connected to B2</strong>
              <span>Bucket: {testResult.bucket} · {testResult.objectCount} objects visible</span>
            </>
          ) : (
            <>
              <strong>B2 Connection Failed</strong>
              <span>{testResult.error}</span>
            </>
          )}
          <button className={styles.alertClose} onClick={() => setTestResult(null)}>✕</button>
        </div>
      )}

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <button
              className={styles.testBtn}
              onClick={handleTestB2}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test B2 Connection"}
            </button>
          </div>
          <FolderTree
            folders={folders}
            selectedFolder={filter.folder || ""}
            onSelect={(folder) => {
              setFilter((f) => ({ ...f, folder }));
              setPage(1);
            }}
          />
        </aside>
        <main className={styles.main}>
          <PhotoGrid
            files={files}
            loading={loading}
            lightboxIndex={lightboxIndex}
            onFileClick={openLightbox}
          />
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={styles.pageBtn}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          files={files}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </div>
  );
}