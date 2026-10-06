# unitconv

A tiny command-line unit converter, built by coding agents on Agent Launchpad (QA run 2026-10-06).
Node 18 or later, built-ins only: no dependencies.

## Usage

```
node convert.mjs <value> <from> <to>
```

```
$ node convert.mjs 10 km mi
6.2137
$ node convert.mjs -40 C F
-40
```

| Dimension   | Units (case-sensitive)            |
| ----------- | --------------------------------- |
| length      | `mm` `cm` `m` `km` `in` `ft` `yd` `mi` |
| mass        | `mg` `g` `kg` `oz` `lb`           |
| temperature | `C` `F` `K`                       |

The result is rounded to at most 4 decimal places, half away from zero, with no trailing zeros
and never `-0`. The arithmetic is exact (fractions of big integers), so there is no floating-point
drift and no exponent notation.

`<value>` is a decimal number such as `12`, `-3.5` or `.25` (no exponent, no comma).

Refusals print one line on stderr, nothing on stdout, and exit non-zero: 2 for a wrong number of
arguments, 1 for a value that is not a decimal number, an unknown unit, units of different
dimensions or a temperature below absolute zero.

`node convert.mjs --help` prints the usage. `npm test` runs the tests.
