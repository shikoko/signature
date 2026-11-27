// Renders card.html into the two share pictures:
//   assets/social-preview.png   1200x630, the page's og:image
//   tools/social-card/github-social-preview.png   1280x640, for the repository's
//     social preview on GitHub (Settings, General, Social preview), uploaded by hand
// It stops if the fonts didn't load, so a picture never goes out in fallback fonts.
//
// From this folder: npm ci, npx playwright install chromium, then npm run render.

const { chromium } = require("playwright");
const path = require("path");

const here = __dirname;
const root = path.resolve(here, "..", "..");
const pictures = [
  { width: 1200, height: 630, file: path.join(root, "assets", "social-preview.png") },
  { width: 1280, height: 640, file: path.join(here, "github-social-preview.png") },
];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const { width, height, file } of pictures) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto("file://" + path.join(here, "card.html"), { waitUntil: "networkidle" });
      const missing = await page.evaluate(async () => {
        const fonts = [["Bricolage Grotesque", "700"], ["Inter", "500"], ["JetBrains Mono", "500"]];
        await document.fonts.ready;
        return fonts.filter(([family, weight]) => !document.fonts.check(`${weight} 16px "${family}"`)).map(([family]) => family);
      });
      if (missing.length) throw new Error(`${missing.join(", ")} didn't load.`);
      await page.screenshot({ path: file });
      await page.close();
      console.log(path.relative(root, file), `${width}x${height}`);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
