import { validateUrl, VERSION } from './core.mjs';
import { gunzipSync } from 'node:zlib';

export async function getText(input, { timeoutMs = 20000, maxBytes = 8_000_000 } = {}) {
  const url = validateUrl(input);
  const response = await fetch(url, { headers: { 'user-agent': `CommerceAccessibilityLab/${VERSION} (+https://github.com/JonatasRicardo/commerce-accessibility-lab)` }, signal: AbortSignal.timeout(timeoutMs) });
  const reader = response.body?.getReader();
  const chunks = []; let total = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length;
      if (total > maxBytes) { await reader.cancel(); throw new Error(`Resposta excede ${maxBytes} bytes: ${url}`); }
      chunks.push(Buffer.from(value));
    }
  }
  let body = Buffer.concat(chunks);
  // Some archived responses carry a gzip payload without a Content-Encoding header.
  if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body, { maxOutputLength: maxBytes });
  return { url: response.url, status: response.status, text: body.toString('utf8'), headers: Object.fromEntries(response.headers) };
}
