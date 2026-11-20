// 의존성 없이 PWA 아이콘 PNG(192·512)를 만든다. 파란 바탕에 흰 2x2 판, 대각선이 그어진 검은 단서 칸 두 개.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function icon(size) {
  const BG = [0x2f, 0x5b, 0xd3];
  const WHITE = [0xff, 0xff, 0xff];
  const LINE = [0x1c, 0x22, 0x33];
  const inset = Math.round(size * 0.2);
  const boardSize = size - inset * 2;
  const half = boardSize / 2;
  const thick = Math.max(2, Math.round(size / 64));
  const diag = Math.max(1, Math.round(size / 128));
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let px = BG;
      const bx = x - inset;
      const by = y - inset;
      if (bx >= 0 && by >= 0 && bx < boardSize && by < boardSize) {
        const cx = bx < half ? 0 : 1;
        const cy = by < half ? 0 : 1;
        const block = cx === cy;
        px = block ? LINE : WHITE;
        // 단서 칸의 대각선
        if (block && Math.abs(bx - cx * half - (by - cy * half)) < diag) px = WHITE;
        if (Math.abs(bx - half) < thick / 2 || Math.abs(by - half) < thick / 2) px = LINE;
        if (bx < thick || by < thick || bx >= boardSize - thick || by >= boardSize - thick) px = LINE;
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), icon(size));
}
console.log('icons written');
