export interface IndexedFile {
  id: string;
  objectKey: string;
  filename: string;
  folderPath: string;
  size: number;
  lastModified: Date;
  contentType: string | null;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

export interface FileFilter {
  search?: string;
  folder?: string;
  sortBy?: "newest" | "oldest" | "name" | "size";
  deliveryOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedFiles {
  files: IndexedFile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface S3Object {
  Key: string;
  Size: number;
  LastModified: Date;
}

export interface ScanResult {
  scanned: number;
  added: number;
  removed: number;
  errors: string[];
}