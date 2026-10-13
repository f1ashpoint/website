import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') : './data/uploads'));
const MAX = 5 * 1024 * 1024;
/** Detect image type from magic bytes, never from the client-provided type or name. */
export function sniff(buf: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
export function saveUpload(buf: Buffer): string {
  if (buf.length > MAX) throw new Error('too_large');
  const ext = sniff(buf); if (!ext) throw new Error('bad_type');
  fs.mkdirSync(uploadDir(), { recursive: true });
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(uploadDir(), name), buf);
  return `/api/media/${name}`;
}
