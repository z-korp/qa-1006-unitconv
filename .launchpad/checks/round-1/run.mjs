// .launchpad/checks/round-1/run.mjs: round 1's checks (the converter). Run them yourself from the repository's root:
//   node .launchpad/checks/round-1/run.mjs
import { check, harness } from "./lib/harness.mjs";
import { entry, refuses, succeeds } from "./lib/entry.mjs";

const { test, done } = harness();
const convert = entry("node", ["convert.mjs"]); // "node" is the Node running the check

async function prints(args, expected) {
  const r = await succeeds(convert, args);
  check(r.out === `${expected}\n`, `convert.mjs ${args.join(" ")} printed ${JSON.stringify(r.out)}, expected ${JSON.stringify(`${expected}\n`)}`);
}

await test("converts lengths", async () => {
  await prints(["10", "km", "mi"], "6.2137");
  await prints(["1", "in", "cm"], "2.54");
  await prints(["1", "mi", "ft"], "5280");
  await prints(["3", "yd", "in"], "108");
  await prints(["1500", "mm", "m"], "1.5");
});

await test("converts masses", async () => {
  await prints(["1", "lb", "kg"], "0.4536");
  await prints(["1", "kg", "oz"], "35.274");
  await prints(["1", "lb", "oz"], "16");
  await prints(["2500", "mg", "g"], "2.5");
});

await test("converts temperatures", async () => {
  await prints(["100", "C", "F"], "212");
  await prints(["-40", "F", "C"], "-40");
  await prints(["0", "K", "C"], "-273.15");
  await prints(["32", "F", "K"], "273.15");
});

await test("accepts negative and decimal values", async () => {
  await prints(["-3.5", "km", "m"], "-3500");
  await prints(["0.25", "ft", "in"], "3");
});

await test("rounds to at most 4 decimals, without trailing zeros or -0", async () => {
  await prints(["1", "mm", "in"], "0.0394");
  await prints(["2", "g", "kg"], "0.002");
  await prints(["1", "m", "cm"], "100");
  await prints(["1", "mg", "lb"], "0");
  await prints(["-0.00001", "m", "m"], "0");
});

await test("prints a usage with --help", async () => {
  const r = await succeeds(convert, ["--help"]);
  check(r.out.includes("convert.mjs"), `--help printed ${JSON.stringify(r.out.slice(0, 200))}, expected a usage naming convert.mjs`);
});

await test("refuses the wrong number of arguments", async () => {
  await prints(["1", "m", "cm"], "100");
  await refuses(convert, [], "no argument");
  await refuses(convert, ["1", "m"], "two arguments");
  await refuses(convert, ["1", "m", "cm", "mm"], "four arguments");
});

await test("refuses a value that is not a finite number", async () => {
  await prints(["1.5", "m", "cm"], "150");
  for (const v of ["abc", "NaN", "Infinity", "-Infinity", "1,5", ""]) await refuses(convert, [v, "m", "cm"], `value ${JSON.stringify(v)}`);
});

await test("refuses an unknown unit", async () => {
  await prints(["1", "km", "m"], "1000");
  await refuses(convert, ["1", "km", "parsec"], "unknown target unit");
  await refuses(convert, ["1", "KM", "m"], "unit symbols are case-sensitive");
  await refuses(convert, ["1", "toString", "m"], "a property name is not a unit");
});

await test("refuses units of different dimensions", async () => {
  await prints(["1", "kg", "g"], "1000");
  await refuses(convert, ["1", "kg", "m"], "mass to length");
  await refuses(convert, ["1", "C", "kg"], "temperature to mass");
});

await test("refuses a temperature below absolute zero", async () => {
  await prints(["-273.15", "C", "K"], "0");
  await refuses(convert, ["-300", "C", "K"], "-300 C");
  await refuses(convert, ["-1", "K", "C"], "-1 K");
  await refuses(convert, ["-500", "F", "C"], "-500 F");
});

done();
