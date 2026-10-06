#!/usr/bin/env node
// unitconv: node convert.mjs <value> <from> <to>
// Exact arithmetic: every number is a fraction of BigInts, so 0.1 + 0.2 issues never reach the output.

const USAGE = `Usage: node convert.mjs <value> <from> <to>

Converts <value> from one unit to another of the same dimension.
  length       mm cm m km in ft yd mi
  mass         mg g kg oz lb
  temperature  C F K

Example: node convert.mjs 10 km mi   prints 6.2137`;

// One table: a value v in a unit is (v × scale + offset) in its dimension's base unit (m, kg, K).
const UNITS = {
  mm: { dim: 'length', scale: '0.001' },
  cm: { dim: 'length', scale: '0.01' },
  m: { dim: 'length', scale: '1' },
  km: { dim: 'length', scale: '1000' },
  in: { dim: 'length', scale: '0.0254' }, // 2.54 cm exactly
  ft: { dim: 'length', scale: '0.3048' }, // 12 in
  yd: { dim: 'length', scale: '0.9144' }, // 3 ft
  mi: { dim: 'length', scale: '1609.344' }, // 1760 yd
  mg: { dim: 'mass', scale: '0.000001' },
  g: { dim: 'mass', scale: '0.001' },
  kg: { dim: 'mass', scale: '1' },
  oz: { dim: 'mass', scale: '0.028349523125' }, // 1/16 lb
  lb: { dim: 'mass', scale: '0.45359237' }, // exactly
  C: { dim: 'temperature', scale: '1', offset: '273.15' }, // K = C + 273.15
  F: { dim: 'temperature', scale: '5/9', offset: '45967/180' }, // K = (F + 459.67) × 5/9
  K: { dim: 'temperature', scale: '1' },
};

const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const PLACES = 4n;

class Refusal extends Error {}

// Fractions are [numerator, denominator] with a positive denominator.
function fraction(text) {
  if (text.includes('/')) {
    const [n, d] = text.split('/');
    return [BigInt(n), BigInt(d)];
  }
  const negative = text.startsWith('-');
  const [whole, decimals = ''] = text.replace(/^[+-]/, '').split('.');
  const n = BigInt((whole || '0') + decimals);
  return [negative ? -n : n, 10n ** BigInt(decimals.length)];
}

const add = ([a, b], [c, d]) => [a * d + c * b, b * d];
const sub = (x, [c, d]) => add(x, [-c, d]);
const mul = ([a, b], [c, d]) => [a * c, b * d];
const div = ([a, b], [c, d]) => (c < 0n ? [-a * d, -b * c] : [a * d, b * c]);

// Rounds half away from zero to PLACES decimals, without trailing zeros, a trailing dot or -0.
function format([n, d]) {
  const unit = 10n ** PLACES;
  const magnitude = n < 0n ? -n : n;
  const rounded = (2n * magnitude * unit + d) / (2n * d);
  if (rounded === 0n) return '0';
  const decimals = (rounded % unit).toString().padStart(Number(PLACES), '0').replace(/0+$/, '');
  const digits = (rounded / unit).toString() + (decimals ? `.${decimals}` : '');
  return n < 0n ? `-${digits}` : digits;
}

function unit(symbol) {
  if (!Object.hasOwn(UNITS, symbol)) {
    throw new Refusal(`unknown unit "${symbol}" (known: ${Object.keys(UNITS).join(' ')})`);
  }
  const { dim, scale, offset = '0' } = UNITS[symbol];
  return { symbol, dim, scale: fraction(scale), offset: fraction(offset) };
}

function convert(valueText, fromSymbol, toSymbol) {
  if (!DECIMAL.test(valueText)) throw new Refusal(`"${valueText}" is not a finite decimal number`);
  const from = unit(fromSymbol);
  const to = unit(toSymbol);
  if (from.dim !== to.dim) {
    throw new Refusal(`cannot convert ${from.dim} (${from.symbol}) to ${to.dim} (${to.symbol})`);
  }
  const base = add(mul(fraction(valueText), from.scale), from.offset);
  if (from.dim === 'temperature' && base[0] < 0n) {
    throw new Refusal(`${valueText} ${from.symbol} is below absolute zero`);
  }
  return format(div(sub(base, to.offset), to.scale));
}

function main(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.length !== 3) {
    process.stderr.write(`convert: expected 3 arguments, got ${args.length} (node convert.mjs --help)\n`);
    return 2;
  }
  try {
    process.stdout.write(`${convert(...args)}\n`);
    return 0;
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    process.stderr.write(`convert: ${error.message}\n`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
