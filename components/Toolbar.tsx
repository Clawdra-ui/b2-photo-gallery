"use client";

import { useState, useCallback } from "react";
import styles from "./Toolbar.module.css";
import { FileFilter } from "@/lib/types";

interface ToolbarProps {
  filter: FileFilter;
  onFilterChange: (filter: FileFilter) => void;
  onScan: () => void;
  scanning: boolean;
  scanStatus: { total: number; lastScan: string | null } | null;
  total: number;
}

export default function Toolbar({
  filter,
  onFilterChange,
  onScan,
  scanning,
  scanStatus,
  total,
}: ToolbarProps) {
  const [searchValue, setSearchValue] = useState(filter.search || "");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onFilterChange({ ...filter, search: searchValue });
    },
    [filter, searchValue, onFilterChange]
  );

  const clearSearch = useCallback(() => {
    setSearchValue("");
    onFilterChange({ ...filter, search: "" });
  }, [filter, onFilterChange]);

  return (
    <header className={styles.toolbar}>
      <div className={styles.left}>
        <span className={styles.logo}>B2 Gallery</span>
        {scanStatus && (
          <span className={styles.stat}>
            {scanStatus.total.toLocaleString()} files
            {scanStatus.lastScan && (
              <span className={styles.lastScan}>
                {" "}· scanned {new Date(scanStatus.lastScan).toLocaleString()}
              </span>
            )}
          </span>
        )}
      </div>

      <form className={styles.search} onSubmit={handleSearch}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search files..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        {searchValue && (
          <button type="button" className={styles.clearBtn} onClick={clearSearch}>
            ✕
          </button>
        )}
      </form>

      <div className={styles.right}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filter.deliveryOnly || false}
            onChange={(e) =>
              onFilterChange({ ...filter, deliveryOnly: e.target.checked })
            }
          />
          <span>Delivery folders only</span>
        </label>

        <select
          className={styles.select}
          value={filter.sortBy || "newest"}
          onChange={(e) =>
            onFilterChange({ ...filter, sortBy: e.target.value as FileFilter["sortBy"] })
          }
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
          <option value="size">Largest first</option>
        </select>

        <button
          className={styles.scanBtn}
          onClick={onScan}
          disabled={scanning}
        >
          {scanning ? "Scanning..." : "Rescan Backblaze"}
        </button>
      </div>
    </header>
  );
}