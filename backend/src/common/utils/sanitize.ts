import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/** Strips every HTML tag from free text so stored content can never carry markup/scripts. */
export function cleanText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
}

/** class-transformer decorator: sanitises incoming strings (and arrays of strings). */
export const Sanitize = () =>
  Transform(({ value }) => {
    if (typeof value === 'string') return cleanText(value);
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? cleanText(v) : v));
    return value;
  });

/** Blank strings from HTML forms become `undefined` so optional validators skip them. */
export const EmptyToUndefined = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));
