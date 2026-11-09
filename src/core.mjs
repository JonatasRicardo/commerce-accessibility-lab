import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const VERSION = '0.1.0';
export const SCHEMA = 'commerce-audit/1';
export const DEFAULTS = Object.freeze({
  viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'America/Sao_Paulo',
  waitMs: 3500, timeoutMs: 45000, reducedMotion: 'reduce',
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
});
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const countOccurrences = violations => violations.reduce((n, v) => n + (v.nodeCount ?? v.nodes?.length ?? 0), 0);
export const csv = rows => rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
export async function writeJson(filename, data) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, JSON.stringify(data, null, 2) + '\n');
}
export function validateUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`URL inválida: ${value}`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use apenas URLs HTTP ou HTTPS.');
  if (url.username || url.password) throw new Error('A URL não pode conter usuário ou senha.');
  url.hash = '';
  return url.href;
}
export function safeLink(value) {
  try { return escapeHtml(validateUrl(value)); } catch { return '#'; }
}
export function finiteNumber(value, name, { min = 0, max = 60000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} deve estar entre ${min} e ${max}.`);
  return n;
}
