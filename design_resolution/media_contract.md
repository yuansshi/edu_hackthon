# PNG admission and bounded media contract

Normative resolution of DR-05 and its overlapping size-clarity finding. This
keeps the approved Node 24 built-ins-only runtime. It is a restricted drawing
transport contract, not a general-purpose image decoder or file-upload service.

## Interface and byte units

Create `src/png.mjs` with `admitDrawing(imagePngBase64)`. It returns
`{pngBytes, width, height, colorType, byteLength, sha256}` or a safe typed error.
The input is canonical padded base64 without a data-URL prefix or whitespace.
Decode once and require its base64 round trip to equal the input.

The **1 MiB limit means at most 1,048,576 PNG file bytes after base64 decoding**.
It does not limit the decompressed raster to 1 MiB. Enforce the limit on both
input and admitted PNG bytes. Dimensions are positive and no greater than
1024 × 768. The current-run image budget counts admitted PNG file bytes once per
immutable work version, not temporary raster buffers or duplicate references.

## Admitted subset and algorithm

Use Buffer operations, `node:crypto` for the admitted-image hash, and
`node:zlib.crc32` / `inflateSync`. No runtime image package is introduced.

1. Validate the eight signature bytes `89 50 4E 47 0D 0A 1A 0A`.
2. Walk at most 1,024 chunks with bounded length/type/data/CRC reads. Require
   alphabetic four-byte chunk names with the reserved third letter uppercase.
   Verify every CRC over the chunk type and data, using unsigned `crc32`.
3. Require one first `IHDR` of length 13. Admit only bit depth 8, color type 2
   (RGB) or 6 (RGBA), compression/filter method 0, and interlace method 0.
4. Require at least one contiguous `IDAT` sequence and one empty final `IEND`.
   Reject missing/duplicate/misordered required chunks and bytes after `IEND`.
   The only admitted critical chunk types are `IHDR`, `IDAT`, and `IEND`; reject
   every other critical type, including optional `PLTE`, as unsupported. Reject
   animation chunks `acTL`, `fcTL`, and `fdAT`.
5. Other ancillary chunks are CRC-checked but not interpreted or decompressed.
   Strip them from the admitted image. Retain only the original `IHDR`, contiguous
   `IDAT` chunks, and `IEND`, so ignored metadata cannot affect later rendering.
   The accepted drawing preserves its image data; metadata is not archived.
6. For channels `c = 3` or `4`, compute `stride = 1 + width * c` and
   `expected = height * stride`. Concatenate the bounded IDAT data and call
   `inflateSync(data, {maxOutputLength: expected, info: true})`.
7. Require exact output length `expected`, full compressed-input consumption
   (`engine.bytesWritten === data.length`), and a filter byte in 0–4 at the start
   of every row. Any inflate/checksum/truncation/overflow failure rejects the input.
   Pixel reconstruction is unnecessary for this admission check: all byte values
   under those supported row filters are defined. Never inspect text as math here.
8. Release the temporary inflated buffer. Hash/store the admitted PNG, return its
   metadata, and use that same immutable PNG for provider input and teacher review.

The largest temporary filtered raster is 3,146,496 bytes for the full RGBA board.
Its dimension-derived bound is separate from the compressed-file and retained
image-budget limits. Browser export must produce this subset; the first browser
gate verifies actual Chromium canvas export. An unsupported exporter offers the
written route and does not silently weaken admission or change the image policy.

## Errors and checks

| Condition | HTTP/code | State effect |
| --- | --- | --- |
| Base64, signature, chunk, CRC, deflate, row-length/filter, or trailing-data failure | `400 INVALID_PNG` | Reject before image admission/provider work; retain prior evidence |
| A readable header requests unsupported bit depth/color/interlace, animation, `PLTE`, or another critical extension | `415 UNSUPPORTED_PNG` | Offer the supported browser export or written route |
| File bytes or dimensions exceed bounds | `413 IMAGE_TOO_LARGE` | Reject atomically without consuming image budget |

Create `test/png.test.mjs`. Construct tiny valid RGB/RGBA fixtures with built-ins
and test each legal row filter, split consecutive IDAT, metadata stripping,
canonical base64, and the exact dimension/file-byte boundaries. Negative cases
cover missing/duplicate/misordered chunks, truncation, bad CRC, unknown critical
and animation chunks, unsupported headers, bad deflate/adler data, wrong row
length/filter, excessive inflation, concatenated/trailing compressed data, and
bytes after IEND. Server tests prove rejection precedes provider calls and does
not change retained bytes or findings.

## Evidence and references

A temporary check on this laptop confirmed Node v24.22.1 exposes `crc32`, the
known CRC32 result for `123456789` is `cbf43926`, output over `maxOutputLength` is
rejected, and `info.engine.bytesWritten` detects trailing compressed input. This
verifies those building blocks, not the future complete PNG validator or browser
capture path.

Primary references: [PNG Third Edition](https://www.w3.org/TR/png-3/) for the
format, and [Node v24.22.1 zlib documentation](https://github.com/nodejs/node/blob/v24.22.1/doc/api/zlib.md)
for CRC and bounded inflation. The restricted admission policy and its limits
above are this project's explicit choices.
