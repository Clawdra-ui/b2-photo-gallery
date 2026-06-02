"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export default function AdminShell({
  active,
  children,
}: {
  active: "galleries" | "new" | "settings";
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      cache: "no-store",
    });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <span className={styles.kicker}>Private Delivery</span>
          <h1 className={styles.brand}>Client Galleries</h1>
          <p className={styles.brandCopy}>Publish private photo collections with unique access keys.</p>
        </div>

        <nav className={styles.nav}>
          <Link href="/admin/galleries" className={active === "galleries" ? styles.navActive : styles.navLink}>Galleries</Link>
          <Link href="/admin/galleries/new" className={active === "new" ? styles.navActive : styles.navLink}>New Gallery</Link>
          <Link href="/admin/settings" className={active === "settings" ? styles.navActive : styles.navLink}>Settings</Link>
        </nav>

        <div className={styles.logoutWrap}>
          <button type="button" className={styles.ghostButton} onClick={logout}>Log Out</button>
        </div>
      </aside>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
