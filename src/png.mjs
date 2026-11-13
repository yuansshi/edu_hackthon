import { createHash } from 'node:crypto';
import { crc32, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_BYTES = 1_048_576;
const MAX_CHUNKS = 1024;

export class DrawingError extends Error {
  constructor(code) {
    super(code);
    this.name = 'DrawingError';
    this.code = code;
  }
}

function reject(code = 'INVALID_PNG') {
  throw new DrawingError(code);
}

export function admitDrawing(imagePngBase64) {
  if (typeof imagePngBase64 !== 'string' || imagePngBase64.length === 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imagePngBase64)) {
    reject();
  }
  if (imagePngBase64.length > 4 * Math.ceil(MAX_BYTES / 3)) reject('IMAGE_TOO_LARGE');
  const input = Buffer.from(imagePngBase64, 'base64');
  if (input.length > MAX_BYTES) reject('IMAGE_TOO_LARGE');
  if (input.toString('base64') !== imagePngBase64 || !input.subarray(0, 8).equals(SIGNATURE)) reject();

  let offset = 8;
  let count = 0;
  let width;
  let height;
  let colorType;
  let idatState = 'before';
  let ended = false;
  const retained = [SIGNATURE];
  const compressed = [];

  while (offset < input.length) {
    if (++count > MAX_CHUNKS || input.length - offset < 12) reject();
    const length = input.readUInt32BE(offset);
    if (length > input.length - offset - 12) reject();
    const end = offset + length + 12;
    const typeBytes = input.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type) ||
        [...typeBytes].some(byte => byte > 127) ||
        crc32(input.subarray(offset + 4, end - 4)) !== input.readUInt32BE(end - 4)) reject();
    const data = input.subarray(offset + 8, end - 4);

    if (count === 1 && type !== 'IHDR') reject();
    if (type === 'IHDR') {
      if (count !== 1 || length !== 13) reject();
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (width === 0 || height === 0) reject();
      if (width > 1024 || height > 768) reject('IMAGE_TOO_LARGE');
      colorType = data[9];
      if (data[8] !== 8 || ![2, 6].includes(colorType) ||
          data[10] !== 0 || data[11] !== 0 || data[12] !== 0) reject('UNSUPPORTED_PNG');
      retained.push(input.subarray(offset, end));
    } else if (type === 'IDAT') {
      if (idatState === 'after') reject();
      idatState = 'during';
      compressed.push(data);
      retained.push(input.subarray(offset, end));
    } else if (type === 'IEND') {
      if (length !== 0 || idatState === 'before' || end !== input.length) reject();
      retained.push(input.subarray(offset, end));
      ended = true;
      offset = end;
      break;
    } else {
      if (idatState === 'during') idatState = 'after';
      if (['acTL', 'fcTL', 'fdAT'].includes(type) || (typeBytes[0] & 32) === 0) {
        reject('UNSUPPORTED_PNG');
      }
    }
    offset = end;
  }
  if (!ended) reject();

  const stride = 1 + width * (colorType === 2 ? 3 : 4);
  const expected = height * stride;
  const data = Buffer.concat(compressed);
  let inflated;
  try {
    inflated = inflateSync(data, { maxOutputLength: expected, info: true });
  } catch {
    reject();
  }
  if (inflated.buffer.length !== expected || inflated.engine.bytesWritten !== data.length) reject();
  for (let row = 0; row < height; row++) {
    if (inflated.buffer[row * stride] > 4) reject();
  }
  const pngBytes = Buffer.concat(retained);
  if (pngBytes.length > MAX_BYTES) reject('IMAGE_TOO_LARGE');
  return {
    pngBytes,
    width,
    height,
    colorType,
    byteLength: pngBytes.length,
    sha256: createHash('sha256').update(pngBytes).digest('hex')
  };
}
