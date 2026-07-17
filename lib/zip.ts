/**
 * Minimal ZIP writer — STORED (no compression) only.
 *
 * Photos are already-compressed PNG/JPG, so DEFLATE would burn CPU for almost no
 * size gain; STORED is the correct method and keeps this dependency-free. Builds
 * the whole archive in memory, which is fine for the sizes involved (a session
 * caps at ~25 participants, photo sets are single-digit files of tens of KB).
 *
 * Format: PKZIP APPNOTE 4.3.7 — a local header + data per entry, then a central
 * directory, then the end-of-central-directory record. No Zip64, no data
 * descriptors (sizes are known up front because everything is buffered).
 */

// CRC-32 (IEEE 802.3), table-based. The ZIP central directory requires it, and a
// wrong CRC makes every extractor reject the archive — so this is covered by a
// known-answer test ("123456789" => 0xCBF43926) before it is trusted.
const CRC_TABLE: number[] = (() => {
  const t = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header signature
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // flags: bit 11 = UTF-8 filename
    local.setUint16(8, 0, true); // method: 0 = stored
    local.setUint16(10, 0, true); // mod time (fixed — deterministic output)
    local.setUint16(12, 0x21, true); // mod date (1980-01-01)
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true); // compressed size == size (stored)
    local.setUint32(22, size, true); // uncompressed size
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra field length

    const localHeader = new Uint8Array(local.buffer);
    locals.push(localHeader, nameBytes, entry.data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); // central directory signature
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, 0x0800, true); // flags: UTF-8
    central.setUint16(10, 0, true); // method: stored
    central.setUint16(12, 0, true);
    central.setUint16(14, 0x21, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra field length
    central.setUint16(32, 0, true); // comment length
    central.setUint16(34, 0, true); // disk number
    central.setUint16(36, 0, true); // internal attrs
    central.setUint32(38, 0, true); // external attrs
    central.setUint32(42, offset, true); // offset of local header

    centrals.push(new Uint8Array(central.buffer), nameBytes);
    offset += localHeader.length + nameBytes.length + size;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory signature
  end.setUint16(8, entries.length, true); // entries on this disk
  end.setUint16(10, entries.length, true); // total entries
  end.setUint32(12, centralSize, true); // central directory size
  end.setUint32(16, offset, true); // central directory offset
  end.setUint16(20, 0, true); // comment length

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
