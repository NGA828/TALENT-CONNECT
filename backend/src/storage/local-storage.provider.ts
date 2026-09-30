import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { StorageProvider, StoredFile } from './storage.provider';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = path.resolve(config.get<string>('UPLOAD_DIR') ?? './uploads');
  }

  async save({ buffer, folder, extension, originalName, mimeType }: Parameters<StorageProvider['save']>[0]): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}${extension}`;
    const target = path.join(this.root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { url: `/uploads/${key}`, key, fileName: originalName, mimeType, size: buffer.length };
  }

  async delete(url: string | null | undefined): Promise<void> {
    if (!url || !url.startsWith('/uploads/')) return; // seed/static or external URLs are never touched
    const target = path.resolve(this.root, url.replace('/uploads/', ''));
    if (!target.startsWith(this.root + path.sep)) return; // path traversal guard
    await fs.unlink(target).catch((e) => this.logger.debug(`Could not delete ${target}: ${e.message}`));
  }
}
