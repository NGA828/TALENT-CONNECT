import { BadRequestException, Inject, Injectable, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import path from 'node:path';
import { STORAGE_PROVIDER, StorageProvider, StoredFile } from './storage.provider';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface TypeRule {
  mediaType: MediaType;
  mimes: string[];
  extensions: string[];
  maxBytes: number;
  matches: (b: Buffer) => boolean;
}

const MB = 1024 * 1024;
const ascii = (b: Buffer, start: number, end: number) => b.subarray(start, end).toString('latin1');

const RULES: TypeRule[] = [
  {
    mediaType: MediaType.IMAGE,
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxBytes: 10 * MB,
    matches: (b) =>
      (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
      (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') ||
      ascii(b, 0, 4) === 'GIF8' ||
      (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP'),
  },
  {
    mediaType: MediaType.VIDEO,
    mimes: ['video/mp4', 'video/webm', 'video/quicktime'],
    extensions: ['.mp4', '.webm', '.mov'],
    maxBytes: 50 * MB,
    matches: (b) => ascii(b, 4, 8) === 'ftyp' || (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3),
  },
  {
    mediaType: MediaType.AUDIO,
    mimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
    extensions: ['.mp3', '.wav', '.ogg', '.m4a'],
    maxBytes: 20 * MB,
    matches: (b) =>
      ascii(b, 0, 3) === 'ID3' ||
      (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) ||
      (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE') ||
      ascii(b, 0, 4) === 'OggS' ||
      ascii(b, 4, 8) === 'ftyp',
  },
  {
    mediaType: MediaType.DOCUMENT,
    mimes: ['application/pdf'],
    extensions: ['.pdf'],
    maxBytes: 10 * MB,
    matches: (b) => ascii(b, 0, 4) === '%PDF',
  },
];

export const MAX_UPLOAD_BYTES = 50 * MB;

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  /** Validates mime type, extension, size and file signature ("magic bytes"). Returns the detected media type. */
  validate(file: UploadedFileLike | undefined, allowed: MediaType[]): { mediaType: MediaType; extension: string } {
    if (!file) throw new BadRequestException('No file was uploaded.');
    const ext = path.extname(file.originalname).toLowerCase();
    const rule = RULES.find((r) => allowed.includes(r.mediaType) && r.mimes.includes(file.mimetype.toLowerCase()));
    if (!rule || !rule.extensions.includes(ext)) {
      const accepted = RULES.filter((r) => allowed.includes(r.mediaType)).flatMap((r) => r.extensions).join(', ');
      throw new UnsupportedMediaTypeException(`Unsupported file type. Accepted formats: ${accepted}.`);
    }
    if (file.size > rule.maxBytes) {
      throw new PayloadTooLargeException(`${rule.mediaType.toLowerCase()} files must be smaller than ${rule.maxBytes / MB} MB.`);
    }
    if (file.size < 12 || !rule.matches(file.buffer)) {
      throw new UnsupportedMediaTypeException('The file content does not match its extension. Upload rejected.');
    }
    return { mediaType: rule.mediaType, extension: ext === '.jpeg' ? '.jpg' : ext };
  }

  async save(file: UploadedFileLike, folder: string, allowed: MediaType[]): Promise<StoredFile & { mediaType: MediaType }> {
    const { mediaType, extension } = this.validate(file, allowed);
    const stored = await this.provider.save({
      buffer: file.buffer,
      folder,
      extension,
      originalName: path.basename(file.originalname).slice(0, 120),
      mimeType: file.mimetype,
    });
    return { ...stored, mediaType };
  }

  remove(url: string | null | undefined) {
    return this.provider.delete(url);
  }
}
