import { closeSync, openSync, readSync } from 'node:fs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from a PNG's IHDR chunk; throws for anything that is not a PNG. */
export function readPngSize(path) {
  const fd = openSync(path, 'r');
  try {
    const head = Buffer.alloc(24);
    const read = readSync(fd, head, 0, 24, 0);
    if (read < 24 || !head.subarray(0, 8).equals(SIGNATURE) || head.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error(`not a PNG file: ${path}`);
    }
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } finally {
    closeSync(fd);
  }
}
