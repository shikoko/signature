# Signature

Make a Gmail signature by editing it in place, then paste it into Gmail.

**Live:** https://shikoko.github.io/signature/

![An example signature with a photo, name, job title, contact details and profile icons, next to the words "Make it yours."](assets/social-preview.png)

## What it does

- **Edit the signature itself.** Click any text on the large preview to type over it, including labels such as "Mobile". Click a link or the photo to change its address. "Add", in the toolbar above the card, adds contact details, profiles, app links and extras.
- **Add what you need:** phone, email, website, address; GitHub, LinkedIn, X, Bluesky, Mastodon, Instagram, YouTube, Dribbble, Medium, Stack Overflow; App Store and Google Play; a booking link or any other link; pronouns, a tagline and small print.
- **Arrange it.** Drag a contact line by the handle that appears beside it, or a link by the link itself; the arrows that appear on hover do the same. The Layout panel opens beside the signature, so every change shows as you make it. It offers side by side, stacked, two columns or compact; the font; photo shape and size; contact on one line or one per line; labels as words, icons or none; links as words, icons or both; icons in brand colours, grey or white on the accent colour; a divider; and the order of the tagline, contact and links.
- **See it as it will arrive.** Under the card, the signature shows at real size in an email, for new emails and for replies, and every change shows there as you make it.
- **Try your own photo.** Choose a picture from your computer or drop one onto the card to see how it looks. It stays in your browser and isn't copied, because Gmail needs a link to a photo that's online; until you add one, a note on top of the toolbar and a dot on "Copy for new emails" say so, with a button to add the link.
- **Two versions, matching Gmail's two settings.** "Copy for new emails" copies the full signature; "Copy for replies" copies a shorter one with just the name, title and links, so long threads don't repeat the whole block. Both are copied as rich text, ready for Gmail's signature box.
- **Checks as you go:** example details still in use, photo links that don't load, the accent colour's contrast against white, and Gmail's 10,000-character limit.
- **Private.** Details are saved in the browser's `localStorage` and sent nowhere.

## How the copied signature is built

Gmail removes stylesheets, web fonts, SVG and embedded `data:` images from signatures, so the copied HTML uses only tables, inline styles and one of five fonts that come with computers and phones: Helvetica, Verdana, Trebuchet, Georgia or Palatino. A font only shows if the reader's device has it, so the list sticks to those; Android and other devices without them use their own font of the same kind. Icons are PNG files hosted on this site under `icons/v1/`; see [icons/README.md](icons/README.md) for where they come from, their licences, and why those files must never change. Outlook and some company mail servers block images, so the Words options for labels and links are the safest choice when that matters.

## Files

- `index.html`, `styles.css`: the page
- `signature.js`: the signature's details and the renderer that produces the copied HTML, the email preview and the editable poster from the same code
- `app.js`: editing, the hover bar, the pop-ups, the Layout panel and copying
- `icons/v1/`: the icons the copied signatures link to
- `tools/icons/`: the script that draws the icons
- `assets/`: the favicon, the example photo and the social preview image
- `.github/workflows/`: publishing the site, checks on pull requests, and tidying pull request footers

## Running it locally

It's a static site with no build step:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing

Every merge into `main` publishes the site to GitHub Pages through the Website workflow. It first checks that no icon in `icons/v1/` has changed or gone, since signatures in people's mail link to them, and publishes nothing if one has. Only the page's own files are published.

Made by [Bogdan Roatis](https://shikoko.github.io/).
