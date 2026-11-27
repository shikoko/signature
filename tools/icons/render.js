// Renders every icon the signature can use, in three styles, as 48x48 PNGs:
//
//   icons/v1/brand/<name>.png   the brand's own colour (contact icons in dark grey)
//   icons/v1/grey/<name>.png    one grey for everything
//   icons/v1/white/<name>.png   white, for the coloured circles
//
// Email clients don't show SVG, so the signature links to these PNGs on the
// site. Signatures already pasted into people's mail keep loading these exact
// files, so never change or delete one: new icons are new files, and new
// artwork for an existing icon goes into icons/v2/.
//
//   cd tools/icons && npm install && npm run render

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const si = require("simple-icons");

const OUT = path.join(__dirname, "..", "..", "icons", "v1");
const TABLER = path.join(__dirname, "node_modules", "@tabler", "icons", "icons");
const tabler = (file) => fs.readFileSync(path.join(TABLER, file), "utf8")
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, "");

// Brand logos from Simple Icons (CC0). LinkedIn isn't in Simple Icons, so it's Tabler's filled mark.
const ICONS = {
  github: { si: si.siGithub, hex: "#181717" },
  linkedin: { filled: tabler("filled/brand-linkedin.svg"), hex: "#0A66C2" },
  x: { si: si.siX, hex: "#000000" },
  bluesky: { si: si.siBluesky, hex: "#1185FE" },
  mastodon: { si: si.siMastodon, hex: "#6364FF" },
  instagram: { si: si.siInstagram, hex: "#FF0069" },
  youtube: { si: si.siYoutube, hex: "#FF0000" },
  dribbble: { si: si.siDribbble, hex: "#EA4C89" },
  medium: { si: si.siMedium, hex: "#000000" },
  stackoverflow: { si: si.siStackoverflow, hex: "#F58025" },
  appstore: { si: si.siAppstore, hex: "#0D96F6" },
  googleplay: { si: si.siGoogleplay, hex: "#414141" },
  phone: { outline: tabler("outline/phone.svg") },
  email: { outline: tabler("outline/mail.svg") },
  website: { outline: tabler("outline/world.svg") },
  address: { outline: tabler("outline/map-pin.svg") },
  booking: { outline: tabler("outline/calendar.svg") },
  custom: { outline: tabler("outline/link.svg") }
};
const STYLES = { brand: null, grey: "#6B7672", white: "#FFFFFF" };
const CONTACT = "#3A4541";

function svg(icon, color) {
  if (icon.si) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill="${color}" d="${icon.si.path}"/></svg>`;
  }
  if (icon.filled) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" style="color:${color}" fill="currentColor">${icon.filled}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" style="color:${color}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.outline}</svg>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 });
  for (const [style, fixed] of Object.entries(STYLES)) {
    fs.mkdirSync(path.join(OUT, style), { recursive: true });
    for (const [name, icon] of Object.entries(ICONS)) {
      const color = fixed || icon.hex || CONTACT;
      await page.setContent(`<html><body style="margin:0;background:transparent"><div id="i" style="width:48px;height:48px;line-height:0">${svg(icon, color)}</div></body></html>`);
      await (await page.$("#i")).screenshot({ path: path.join(OUT, style, name + ".png"), omitBackground: true });
    }
  }
  await browser.close();
  console.log("Rendered " + Object.keys(ICONS).length * Object.keys(STYLES).length + " icons into icons/v1/");
})();
