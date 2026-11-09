import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRobots } from '../src/robots.mjs';

test('search and training groups remain independent; most specific allow wins', () => {
  const r = evaluateRobots({ status: 200, url: 'https://example.org/robots.txt', text: 'User-agent: *\nDisallow: /\nUser-agent: OAI-SearchBot\nDisallow: /products/\nAllow: /products/public/\nUser-agent: GPTBot\nDisallow: /\n' }, 'https://example.org/products/public/shirt');
  assert.equal(r.agents.find(a => a.agent === 'OAI-SearchBot').allowedByFile, true);
  assert.equal(r.agents.find(a => a.agent === 'GPTBot').allowedByFile, false);
  assert.equal(r.agents.find(a => a.agent === 'Googlebot').allowedByFile, false);
});
test('unavailable robots.txt is unknown, not explicitly allowed', () => {
  for (const status of [403, 404, 500, undefined]) {
    const r = evaluateRobots({ status, url: 'https://example.org/robots.txt' }, 'https://example.org/');
    assert.equal(r.available, false);
    assert.ok(r.agents.every(a => a.allowedByFile === null));
  }
});
test('a soft error HTML response is not interpreted as an allow-all robots file', () => {
  const r = evaluateRobots({ status: 200, text: '<!doctype html><html><title>Erro</title></html>', url: 'https://example.org/robots.txt' }, 'https://example.org/');
  assert.equal(r.available, false); assert.equal(r.agents[0].allowedByFile, null);
});
