export interface StoredFile {
  url: string;
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Storage abstraction. The local-disk implementation below can be swapped for
 * Cloudinary / AWS S3 / Supabase Storage by providing another class for STORAGE_PROVIDER.
 */
export abstract class StorageProvider {
  abstract save(input: { buffer: Buffer; folder: string; extension: string; originalName: string; mimeType: string }): Promise<StoredFile>;
  abstract delete(url: string | null | undefined): Promise<void>;
}
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
