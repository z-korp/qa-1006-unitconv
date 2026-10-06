import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../convert.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

function converts(args, expected) {
  const { status, stdout, stderr } = run(...args);
  assert.equal(stderr, '', args.join(' '));
  assert.equal(stdout, `${expected}\n`, args.join(' '));
  assert.equal(status, 0, args.join(' '));
}

function refuses(args, reason) {
  const { status, stdout, stderr } = run(...args);
  assert.notEqual(status, 0, args.join(' '));
  assert.equal(stdout, '', args.join(' '));
  assert.match(stderr, reason, args.join(' '));
  assert.equal(stderr.trimEnd().split('\n').length, 1, 'one line on stderr');
}

test('length', () => {
  converts(['10', 'km', 'mi'], '6.2137');
  converts(['1', 'in', 'cm'], '2.54');
  converts(['1', 'mi', 'yd'], '1760');
  converts(['1', 'yd', 'ft'], '3');
  converts(['1', 'ft', 'in'], '12');
  converts(['1500', 'mm', 'm'], '1.5');
  converts(['1', 'mi', 'km'], '1.6093');
});

test('mass', () => {
  converts(['1', 'lb', 'oz'], '16');
  converts(['1', 'lb', 'kg'], '0.4536');
  converts(['1', 'oz', 'g'], '28.3495');
  converts(['2500', 'mg', 'g'], '2.5');
  converts(['1', 'kg', 'oz'], '35.274');
});

test('temperature', () => {
  converts(['100', 'C', 'F'], '212');
  converts(['-40', 'C', 'F'], '-40');
  converts(['32', 'F', 'C'], '0');
  converts(['0', 'K', 'C'], '-273.15');
  converts(['-459.67', 'F', 'K'], '0');
  converts(['98.6', 'F', 'C'], '37');
});

test('rounding: at most 4 places, no trailing zeros, never -0, no exponent', () => {
  converts(['1', 'mm', 'km'], '0');
  converts(['-0.00001', 'm', 'm'], '0');
  converts(['0.0001', 'm', 'm'], '0.0001');
  converts(['0.00005', 'm', 'm'], '0.0001'); // half away from zero
  converts(['-0.00005', 'm', 'm'], '-0.0001');
  converts(['2.50', 'm', 'm'], '2.5');
  converts(['1000000000000000', 'mi', 'mm'], '1609344000000000000000');
  converts(['.5', 'm', 'cm'], '50');
});

test('refusals', () => {
  refuses([], /expected 3 arguments/);
  refuses(['1', 'm'], /expected 3 arguments/);
  refuses(['1', 'm', 'km', 'x'], /expected 3 arguments/);
  for (const value of ['abc', 'NaN', 'Infinity', '1,5', '', '-Infinity', '1e3', '-']) {
    refuses([value, 'm', 'km'], /not a finite decimal number/);
  }
  refuses(['1', 'M', 'km'], /unknown unit "M"/);
  refuses(['1', 'toString', 'm'], /unknown unit "toString"/);
  refuses(['1', 'kg', 'm'], /cannot convert mass \(kg\) to length \(m\)/);
  refuses(['-300', 'C', 'K'], /below absolute zero/);
  refuses(['-1', 'K', 'C'], /below absolute zero/);
  refuses(['-460', 'F', 'C'], /below absolute zero/);
});

test('--help', () => {
  const { status, stdout, stderr } = run('--help');
  assert.equal(status, 0);
  assert.equal(stderr, '');
  assert.match(stdout, /^Usage: node convert\.mjs <value> <from> <to>/);
});
