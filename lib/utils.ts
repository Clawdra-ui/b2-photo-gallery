interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

export function buildFolderTree(
  files: Array<{ folderPath: string; objectKey: string }>
): FolderNode[] {
  interface TreeNode {
    name: string;
    path: string;
    children: Record<string, TreeNode>;
  }

  const root: Record<string, TreeNode> = {};

  for (const file of files) {
    const parts = file.folderPath.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const fullPath = parts.slice(0, i + 1).join("/");

      if (!current[part]) {
        current[part] = { name: part, path: fullPath, children: {} };
      }

      current = current[part].children;
    }
  }

  function collapse(node: Record<string, TreeNode>): FolderNode[] {
    return Object.values(node).map((child) => ({
      name: child.name,
      path: child.path,
      children: collapse(child.children),
    }));
  }

  return collapse(root);
}

export function isValidObjectKey(key: string): boolean {
  if (!key || key.length === 0 || key.length > 1024) return false;
  if (key.startsWith("/") || key.includes("..")) return false;

  // S3 keys may contain spaces, unicode, etc. Only block control chars and shell-dangerous chars.
  if (/[\x00-\x1f\x7f]/.test(key)) return false;

  return true;
}

export function isJpegFile(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

export function extractFolderPath(objectKey: string): string {
  const lastSlash = objectKey.lastIndexOf("/");
  return lastSlash > 0 ? objectKey.substring(0, lastSlash) : "";
}

export function extractFilename(objectKey: string): string {
  const lastSlash = objectKey.lastIndexOf("/");
  return lastSlash >= 0 ? objectKey.substring(lastSlash + 1) : objectKey;
}

export const DELIVERY_FOLDERS = ["DELIVERY", "EXPORT", "FINAL", "JPG", "CLIENT"];

export function isDeliveryFolder(folderPath: string): boolean {
  const upper = folderPath.toUpperCase();
  return DELIVERY_FOLDERS.some((f) => upper.includes(f));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}