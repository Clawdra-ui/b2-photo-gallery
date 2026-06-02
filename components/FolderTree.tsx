"use client";

import { useState, useMemo } from "react";
import styles from "./FolderTree.module.css";

interface FolderTreeProps {
  folders: string[];
  selectedFolder: string;
  onSelect: (folder: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  depth: number;
}

function buildTree(folders: string[]): TreeNode[] {
  const root: Record<string, TreeNode> = {};

  for (const folder of folders.sort()) {
    const parts = folder.split("/");
    let acc = "";
    let depth = 0;

    for (const part of parts) {
      const prev = acc;
      acc += (acc ? "/" : "") + part;
      depth++;

      if (!root[acc]) {
        root[acc] = {
          name: part,
          path: acc,
          children: [],
          depth,
        };
      }

      if (prev) {
        const parent = root[prev];
        if (parent && !parent.children.find((c) => c.path === acc)) {
          parent.children.push(root[acc]);
        }
      }
    }
  }

  return Object.values(root).filter((n) => n.depth === 1).sort((a, b) => a.name.localeCompare(b.name));
}

export default function FolderTree({ folders, selectedFolder, onSelect }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(folders), [folders]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    const isSelected = selectedFolder === node.path;
    const isExpanded = expanded.has(node.path);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.path}>
        <div
          className={`${styles.node} ${isSelected ? styles.selected : ""}`}
          style={{ paddingLeft: `${12 + (node.depth - 1) * 16}px` }}
          onClick={() => {
            if (hasChildren) toggle(node.path);
            onSelect(node.path);
          }}
        >
          {hasChildren && (
            <span className={`${styles.arrow} ${isExpanded ? styles.open : ""}`}>
              ›
            </span>
          )}
          {!hasChildren && <span className={styles.dot} />}
          <span className={styles.name}>{node.name}</span>
        </div>
        {isExpanded && node.children.map(renderNode)}
      </div>
    );
  };

  return (
    <div className={styles.tree}>
      <div
        className={`${styles.node} ${!selectedFolder ? styles.selected : ""}`}
        onClick={() => onSelect("")}
      >
        <span className={styles.dot} />
        <span className={styles.name}>All Files</span>
      </div>
      {tree.map(renderNode)}
    </div>
  );
}