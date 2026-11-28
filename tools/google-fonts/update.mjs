// Makes assets/google-fonts.json, the Google fonts the Text tab offers, most popular first. Each
// is [name, kind, regular weight, bold weight], where kind indexes `kinds` and a bold weight of 0
// means the family has no bold. Run it to pick up new fonts: node tools/google-fonts/update.mjs
import { writeFile } from "node:fs/promises";

const KINDS = { "Sans Serif": "Sans serif", Serif: "Serif", Display: "Display", Handwriting: "Handwriting", Monospace: "Monospace" };
const NOT_TEXT = new Set(["Noto Color Emoji", "Noto Emoji"]);

const res = await fetch("https://fonts.google.com/metadata/fonts");
if (!res.ok) throw new Error("Google Fonts answered " + res.status);
const body = await res.text();
const families = JSON.parse(body.slice(body.indexOf("{"))).familyMetadataList;
const kinds = Object.keys(KINDS);

const fonts = families
  .filter((f) => f.category in KINDS && !NOT_TEXT.has(f.family))
  .sort((a, b) => a.popularity - b.popularity)
  .map((f) => {
    // Upright weights only; a family with none (italic only) is left out.
    const w = Object.keys(f.fonts).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
    if (!w.length) return null;
    const near = (list, to) => list.reduce((best, x) => Math.abs(x - to) < Math.abs(best - to) ? x : best, list[0]);
    const reg = near(w, 400);
    const heavy = w.filter((x) => x >= 600 && x > reg);
    return [f.family, kinds.indexOf(f.category), reg, heavy.length ? near(heavy, 700) : 0];
  })
  .filter(Boolean);

const json = '{"kinds":' + JSON.stringify(Object.values(KINDS)) + ',"fonts":[\n' + fonts.map((f) => JSON.stringify(f)).join(",\n") + "\n]}\n";
await writeFile(new URL("../../assets/google-fonts.json", import.meta.url), json);
console.log("Wrote " + fonts.length + " fonts, " + Math.round(json.length / 1024) + " KB.");
