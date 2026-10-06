// .launchpad/checks/round-2/run.mjs: round 2's checks (volume and the unit list). Round 1's checks run again on their own.
//   node .launchpad/checks/round-2/run.mjs
import { check, harness } from "./lib/harness.mjs";
import { entry, refuses, succeeds } from "./lib/entry.mjs";

const { test, done } = harness();
const convert = entry("node", ["convert.mjs"]);

async function prints(args, expected) {
  const r = await succeeds(convert, args);
  check(r.out === `${expected}\n`, `convert.mjs ${args.join(" ")} printed ${JSON.stringify(r.out)}, expected ${JSON.stringify(`${expected}\n`)}`);
}

await test("converts volumes", async () => {
  await prints(["1", "gal", "l"], "3.7854");
  await prints(["1", "gal", "cup"], "16");
  await prints(["1", "cup", "tbsp"], "16");
  await prints(["1", "tbsp", "tsp"], "3");
  await prints(["1500", "ml", "l"], "1.5");
  await prints(["1", "tsp", "ml"], "4.9289");
});

await test("refuses volume to another dimension", async () => {
  await prints(["1", "l", "ml"], "1000");
  await refuses(convert, ["1", "l", "kg"], "volume to mass");
  await refuses(convert, ["1", "m", "gal"], "length to volume");
});

await test("lists every unit with --list", async () => {
  const r = await succeeds(convert, ["--list"]);
  const expected = [
    ..."mm cm m km in ft yd mi".split(" ").map((u) => `${u} length`),
    ..."mg g kg oz lb".split(" ").map((u) => `${u} mass`),
    ..."C F K".split(" ").map((u) => `${u} temperature`),
    ..."ml l tsp tbsp cup gal".split(" ").map((u) => `${u} volume`),
  ].join("\n") + "\n";
  check(r.out === expected, `--list printed ${JSON.stringify(r.out)}, expected ${JSON.stringify(expected)}`);
});

done();
