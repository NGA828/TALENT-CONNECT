// Run: node --experimental-strip-types --test test/cameroon.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, toLocalInput } from '../src/lib/format.ts';

test('XAF defaults to whole FCFA while explicit foreign currency is preserved', () => {
  assert.equal(formatMoney(30000), '30,000 FCFA');
  assert.equal(formatMoney(1000.7), '1,001 FCFA');
  assert.equal(formatMoney(0), '0 FCFA');
  assert.equal(formatMoney(null), '—');
  assert.ok(formatMoney(49, 'USD').includes('49'));
});

test('Cameroon event input round-trips across midnight', () => {
  const iso = '2026-09-30T23:30:00.000Z';
  assert.equal(toLocalInput(iso), '2026-10-01T00:30');
  assert.equal(new Date(`${toLocalInput(iso)}:00+01:00`).toISOString(), iso);
});
