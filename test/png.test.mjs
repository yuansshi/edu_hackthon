import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateSync } from 'node:zlib';
import { admitDrawing } from '../src/png.mjs';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

function header(width = 1, height = 1, colorType = 6, bitDepth = 8, interlace = 0) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;
  data[9] = colorType;
  data[12] = interlace;
  return chunk('IHDR', data);
}

function png(...chunks) {
  return Buffer.concat([signature, ...chunks]);
}

function encoded(bytes) {
  return bytes.toString('base64');
}

function fails(bytes, code = 'INVALID_PNG') {
  assert.throws(() => admitDrawing(encoded(bytes)), error => error.code === code);
}

const ihdr = header();
const pixels = Buffer.from([0, 0, 0, 0, 255]);
const idat = chunk('IDAT', deflateSync(pixels));
const end = chunk('IEND');

test('accepts RGB and RGBA drawings with each legal row filter', () => {
  for (const colorType of [2, 6]) {
    for (let filter = 0; filter <= 4; filter++) {
      const row = Buffer.alloc(1 + (colorType === 2 ? 3 : 4));
      row[0] = filter;
      const bytes = png(header(1, 1, colorType), chunk('IDAT', deflateSync(row)), end);
      const result = admitDrawing(encoded(bytes));
      assert.deepEqual(result.pngBytes, bytes);
      assert.equal(result.width, 1);
      assert.equal(result.height, 1);
      assert.equal(result.colorType, colorType);
      assert.equal(result.byteLength, bytes.length);
      assert.match(result.sha256, /^[0-9a-f]{64}$/);
    }
  }
});

test('strips ancillary metadata and retains contiguous split IDAT', () => {
  const zipped = deflateSync(pixels);
  const first = chunk('IDAT', zipped.subarray(0, 3));
  const second = chunk('IDAT', zipped.subarray(3));
  const result = admitDrawing(encoded(png(ihdr, chunk('tEXt', Buffer.from('private')), first, second, end)));
  assert.deepEqual(result.pngBytes, png(ihdr, first, second, end));
});

test('requires canonical base64 and a valid signature', () => {
  const value = encoded(png(ihdr, idat, end));
  for (const input of ['', `${value}\n`, `data:image/png;base64,${value}`, '!!!!', 'AB==']) {
    assert.throws(() => admitDrawing(input), error => error.code === 'INVALID_PNG');
  }
  fails(Buffer.from('not a PNG'));
});

test('enforces image dimensions and decoded byte limit', () => {
  const maxRow = Buffer.alloc(1 + 1024 * 4);
  const maxPixels = Buffer.concat(Array.from({ length: 768 }, () => maxRow));
  const maxImage = png(header(1024, 768), chunk('IDAT', deflateSync(maxPixels)), end);
  assert.equal(admitDrawing(encoded(maxImage)).width, 1024);
  fails(png(header(1025, 1), idat, end), 'IMAGE_TOO_LARGE');
  fails(png(header(1, 769), idat, end), 'IMAGE_TOO_LARGE');
  fails(png(header(0, 1), idat, end));
  const oversized = png(ihdr, chunk('tEXt', Buffer.alloc(1_048_576)), idat, end);
  fails(oversized, 'IMAGE_TOO_LARGE');
  const exact = png(ihdr, chunk('tEXt', Buffer.alloc(1_048_576 - png(ihdr, idat, end).length - 12)), idat, end);
  assert.equal(exact.length, 1_048_576);
  assert.deepEqual(admitDrawing(encoded(exact)).pngBytes, png(ihdr, idat, end));
});

test('rejects malformed, missing, duplicated, reordered, and truncated chunks', () => {
  const valid = png(ihdr, idat, end);
  const corrupted = Buffer.from(valid);
  corrupted[20] ^= 1;
  for (const bytes of [
    corrupted, valid.subarray(0, valid.length - 1), png(idat, end),
    png(ihdr, ihdr, idat, end), png(ihdr, end), png(ihdr, idat),
    png(ihdr, idat, end, end), png(ihdr, chunk('IEND', Buffer.from([0]))),
    png(ihdr, idat, chunk('tEXt'), idat, end),
    Buffer.concat([valid, Buffer.from([0])]), png(ihdr, chunk('abct'), idat, end)
  ]) fails(bytes);
});

test('enforces the chunk count limit', () => {
  const ancillary = chunk('tEXt');
  const atLimit = png(ihdr, ...Array(1021).fill(ancillary), idat, end);
  assert.deepEqual(admitDrawing(encoded(atLimit)).pngBytes, png(ihdr, idat, end));
  fails(png(ihdr, ...Array(1022).fill(ancillary), idat, end));
});

test('rejects unsupported image modes, critical chunks and animation', () => {
  for (const h of [header(1, 1, 6, 16), header(1, 1, 0), header(1, 1, 6, 8, 1)]) {
    fails(png(h, idat, end), 'UNSUPPORTED_PNG');
  }
  for (const type of ['PLTE', 'ABCD', 'acTL', 'fcTL', 'fdAT']) {
    fails(png(ihdr, chunk(type), idat, end), 'UNSUPPORTED_PNG');
  }
});

test('rejects corrupt, oversized, truncated and trailing compressed streams', () => {
  const zip = deflateSync(pixels);
  const corrupt = Buffer.from(zip);
  corrupt[corrupt.length - 1] ^= 1;
  for (const data of [
    corrupt, zip.subarray(0, -1), deflateSync(pixels.subarray(0, 4)),
    deflateSync(Buffer.alloc(6)), deflateSync(Buffer.from([5, 0, 0, 0, 0])),
    Buffer.concat([zip, Buffer.from([0])]), Buffer.concat([zip, zip])
  ]) fails(png(ihdr, chunk('IDAT', data), end));
});

test('bounds inflation from a small compressed payload', () => {
  const bomb = deflateSync(Buffer.alloc(1024 * 1024));
  assert.ok(bomb.length < 2048);
  fails(png(ihdr, chunk('IDAT', bomb), end));
});

test('checks every chunk CRC and rejects invalid header methods', () => {
  const damagedIdat = Buffer.from(idat);
  damagedIdat[damagedIdat.length - 1] ^= 1;
  const damagedEnd = Buffer.from(end);
  damagedEnd[damagedEnd.length - 1] ^= 1;
  fails(png(ihdr, damagedIdat, end));
  fails(png(ihdr, idat, damagedEnd));
  for (const index of [10, 11]) {
    const data = Buffer.from(ihdr.subarray(8, -4));
    data[index] = 1;
    fails(png(chunk('IHDR', data), idat, end), 'UNSUPPORTED_PNG');
  }
});
