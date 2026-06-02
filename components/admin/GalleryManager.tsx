"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GalleryDetail } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import styles from "./admin.module.css";

type UploadProgress = {
  name: string;
  progress: number;
  state: "queued" | "uploading" | "registering" | "done" | "error";
  message?: string;
};

type BrowserFile = File & { webkitRelativePath?: string };

async function loadImageDimensions(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => resolve(null);
    image.src = URL.createObjectURL(file);
  });
}

function xhrUpload(url: string, file: File, headers: Record<string, string>, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export default function GalleryManager({ gallery }: { gallery: GalleryDetail }) {
  const router = useRouter();
  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    title: gallery.title,
    clientName: gallery.clientName || "",
    clientEmail: gallery.clientEmail || "",
    description: gallery.description || "",
    status: gallery.status,
    allowDownload: gallery.allowDownload,
    expiresAt: gallery.expiresAt ? gallery.expiresAt.slice(0, 16) : "",
    coverPhotoId: gallery.coverPhotoId || "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const [importPrefix, setImportPrefix] = useState("");
  const publicUrl = gallery.publicUrl;

  useEffect(() => {
    const input = directoryInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Unable to save gallery");
      return;
    }

    setMessage("Gallery updated");
    router.refresh();
  }

  async function regenerateKey() {
    setMessage("");
    setError("");
    await fetch(`/api/admin/galleries/${gallery.id}/regenerate-key`, { method: "POST" });
    router.refresh();
  }

  async function importExistingPrefix() {
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/galleries/${gallery.id}/import-prefix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: importPrefix }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Import failed");
      return;
    }

    setMessage(`Imported ${data.importedCount} files`);
    router.refresh();
  }

  async function handleFiles(selected: FileList | null) {
    if (!selected?.length) return;

    const files = Array.from(selected) as BrowserFile[];
    const valid = files.filter((file) => /\.jpe?g$/i.test(file.name));
    const invalid = files.filter((file) => !/\.jpe?g$/i.test(file.name)).map((file) => file.name);
    setInvalidFiles(invalid);

    const progress: UploadProgress[] = valid.map((file) => ({
      name: file.webkitRelativePath || file.name,
      progress: 0,
      state: "queued",
    }));
    setUploadProgress(progress);

    for (let index = 0; index < valid.length; index += 1) {
      const file = valid[index];
      const relativePath = file.webkitRelativePath || file.name;

      setUploadProgress((current) => current.map((item, currentIndex) => (
        currentIndex === index ? { ...item, state: "uploading" } : item
      )));

      const uploadUrlResponse = await fetch(`/api/admin/galleries/${gallery.id}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          relativePath,
          contentType: file.type || "image/jpeg",
          size: file.size,
        }),
      });

      const uploadData = await uploadUrlResponse.json().catch(() => ({}));

      if (!uploadUrlResponse.ok) {
        setUploadProgress((current) => current.map((item, currentIndex) => (
          currentIndex === index ? { ...item, state: "error", message: uploadData.error || "Upload URL failed" } : item
        )));
        continue;
      }

      try {
        await xhrUpload(uploadData.uploadUrl, file, uploadData.headersIfNeeded, (value) => {
          setUploadProgress((current) => current.map((item, currentIndex) => (
            currentIndex === index ? { ...item, progress: value, state: "uploading" } : item
          )));
        });

        setUploadProgress((current) => current.map((item, currentIndex) => (
          currentIndex === index ? { ...item, state: "registering", progress: 100 } : item
        )));

        const dimensions = await loadImageDimensions(file);

        const registerResponse = await fetch(`/api/admin/galleries/${gallery.id}/photos/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            b2Key: uploadData.b2Key,
            filename: file.name,
            originalRelativePath: relativePath,
            folderPath: relativePath.includes("/") ? relativePath.slice(0, relativePath.lastIndexOf("/")) : null,
            size: file.size,
            contentType: file.type || "image/jpeg",
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
          }),
        });
        const registerData = await registerResponse.json().catch(() => ({}));

        if (!registerResponse.ok) {
          throw new Error(registerData.error || "Photo registration failed");
        }

        setUploadProgress((current) => current.map((item, currentIndex) => (
          currentIndex === index ? { ...item, state: "done", message: "Uploaded" } : item
        )));
      } catch (uploadError) {
        setUploadProgress((current) => current.map((item, currentIndex) => (
          currentIndex === index ? { ...item, state: "error", message: uploadError instanceof Error ? uploadError.message : "Upload failed" } : item
        )));
      }
    }

    router.refresh();
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/admin/photos/${photoId}`, { method: "DELETE" });
    router.refresh();
  }

  async function setCover(photoId: string) {
    await fetch(`/api/admin/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverPhotoId: photoId }),
    });
    router.refresh();
  }

  async function updateSortOrder(photoId: string, sortOrder: number) {
    await fetch(`/api/admin/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder }),
    });
    router.refresh();
  }

  return (
    <div className={styles.managerLayout}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.kicker}>Manage Gallery</span>
            <h1>{gallery.title}</h1>
            <p>{gallery.photoCount} photos · prefix `{gallery.b2Prefix}`</p>
          </div>
          <div className={styles.sectionHeaderActions}>
            <button className={styles.ghostButton} onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy Client Link</button>
            <Link href={`/g/${gallery.accessKey}?preview=1`} target="_blank" className={styles.ghostLink}>Admin Preview</Link>
          </div>
        </div>

        <form className={styles.formGrid} onSubmit={saveDetails}>
          <label className={styles.field}>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Client name</span>
            <input value={form.clientName} onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Client email</span>
            <input value={form.clientEmail} onChange={(event) => setForm((current) => ({ ...current, clientEmail: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as GalleryDetail["status"] }))}>
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
            <span>Allow downloads</span>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} />
          </label>

          {message ? <div className={`${styles.successBanner} ${styles.fieldFull}`}>{message}</div> : null}
          {error ? <div className={`${styles.errorBanner} ${styles.fieldFull}`}>{error}</div> : null}

          <div className={`${styles.formActions} ${styles.fieldFull}`}>
            <button type="submit" className={styles.primaryButton}>Save Details</button>
            <button type="button" className={styles.subtleButton} onClick={regenerateKey}>Regenerate Access Key</button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.kicker}>Upload</span>
            <h2>Add photos</h2>
            <p>Direct browser-to-B2 upload using presigned PUT URLs.</p>
          </div>
        </div>

        <div
          className={styles.dropzone}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <p>Drag JPG/JPEG files here</p>
          <div className={styles.dropzoneActions}>
            <button type="button" className={styles.primaryButton} onClick={() => fileInputRef.current?.click()}>Select Files</button>
            <button type="button" className={styles.ghostButton} onClick={() => directoryInputRef.current?.click()}>Select Folder</button>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,image/jpeg" hidden onChange={(event) => void handleFiles(event.target.files)} />
          <input ref={directoryInputRef} type="file" multiple accept=".jpg,.jpeg,image/jpeg" hidden onChange={(event) => void handleFiles(event.target.files)} />
        </div>

        {invalidFiles.length ? (
          <div className={styles.errorBanner}>
            Rejected: {invalidFiles.join(", ")}
          </div>
        ) : null}

        {uploadProgress.length ? (
          <div className={styles.uploadList}>
            {uploadProgress.map((item) => (
              <div key={item.name} className={styles.uploadItem}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.state}</span>
                </div>
                <progress value={item.progress} max={100} />
                {item.message ? <small>{item.message}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.kicker}>Import Existing B2 Prefix</span>
            <h2>Register existing files</h2>
            <p>Use this for folders already uploaded directly to Backblaze.</p>
          </div>
        </div>

        <div className={styles.inlineForm}>
          <input
            value={importPrefix}
            onChange={(event) => setImportPrefix(event.target.value)}
            placeholder="e.g. AndrewBoutsikas_SoleilHotelParos"
          />
          <button className={styles.primaryButton} onClick={importExistingPrefix}>Import Prefix</button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.kicker}>Photo Library</span>
            <h2>Gallery photos</h2>
          </div>
        </div>

        <div className={styles.photoGrid}>
          {gallery.photos.map((photo) => (
            <article key={photo.id} className={styles.photoCard}>
              <img src={photo.previewUrl || ""} alt={photo.filename} className={styles.photoPreview} />
              <div className={styles.photoMeta}>
                <strong>{photo.filename}</strong>
                <span>{formatFileSize(photo.size)}</span>
                <span>{photo.folderPath || "Root"}</span>
              </div>
              <div className={styles.photoControls}>
                <button className={styles.ghostButton} onClick={() => setCover(photo.id)}>Set Cover</button>
                <label className={styles.sortField}>
                  <span>Order</span>
                  <input
                    type="number"
                    defaultValue={photo.sortOrder ?? 0}
                    onBlur={(event) => void updateSortOrder(photo.id, Number(event.target.value || 0))}
                  />
                </label>
                <button className={styles.dangerButton} onClick={() => deletePhoto(photo.id)}>Delete</button>
              </div>
              {gallery.coverPhotoId === photo.id ? <div className={styles.coverBadge}>Cover Photo</div> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
