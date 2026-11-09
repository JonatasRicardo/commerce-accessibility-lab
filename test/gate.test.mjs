import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGate } from '../src/gate.mjs';
const now = Date.parse('2026-11-09T12:00:00Z');
const fixture = () => ({ kind: 'live-audit', pages: [{ id: 'p', status: 'ok', collectedAt: new Date(now).toISOString(), axeVersion: '4.10.3', accessibility: { violations: [], incomplete: [{ id: 'manual' }] } }] });
test('gate blocks serious findings but retains inconclusive items without treating them as passes', () => {
  const r = fixture();
  assert.equal(evaluateGate(r, { now }).qualityGate.passed, true);
  assert.equal(evaluateGate(r, { now }).qualityGate.counts.incompleteRules, 1);
  r.pages[0].accessibility.violations.push({ id: 'button-name', impact: 'critical', nodeCount: 1 });
  assert.equal(evaluateGate(r, { now }).qualityGate.passed, false);
  r.pages[0].accessibility.violations[0].nodeCount = -1;
  assert.equal(evaluateGate(r, { now }).qualityGate.passed, false);
});
test('gate refuses historical replay, blocked, empty, stale and future evidence', () => {
  for (const change of [r => r.kind = 'study-replay', r => r.pages = [], r => r.pages[0].status = 'blocked', r => r.pages[0].collectedAt = '2020-01-01', r => r.pages[0].collectedAt = '2030-01-01']) {
    const r = fixture(); change(r); assert.equal(evaluateGate(r, { now }).qualityGate.passed, false);
  }
  assert.throws(() => evaluateGate(fixture(), { policy: { maxCritical: -1 } }), /Política inválida/);
});
