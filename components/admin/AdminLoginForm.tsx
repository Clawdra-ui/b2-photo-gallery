"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Login failed");
      setSubmitting(false);
      return;
    }

    router.push("/admin/galleries");
    router.refresh();
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <span className={styles.kicker}>Admin Access</span>
        <h1>Manage client galleries</h1>
        <p>Create private gallery links, upload folders, and import existing Backblaze prefixes.</p>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </label>

          {error ? <div className={styles.errorBanner}>{error}</div> : null}

          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
