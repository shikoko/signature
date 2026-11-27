# Signature icons

These PNG files are what copied signatures link to, at
`https://shikoko.github.io/signature/icons/v1/<style>/<name>.png`. Email
clients don't show SVG or embedded images, so the icons have to be hosted
files.

**Never change, move or delete a file in `v1/`.** Signatures that people have
already pasted into their mail keep loading these exact addresses. Add new
icons as new files; new artwork for an existing icon goes into `v2/`.

## Styles

- `brand/`: each brand's own colour; contact icons (phone, email, website,
  address, booking, custom link) in dark grey.
- `grey/`: everything in one grey (`#6B7672`).
- `white/`: everything in white, shown inside a circle of the signature's
  accent colour.

Each icon is 48×48 pixels and is shown at 10 to 16 pixels, so it stays sharp
on high-resolution screens.

## Sources and licences

- Brand logos (GitHub, X, Bluesky, Mastodon, Instagram, YouTube, Dribbble,
  Medium, Stack Overflow, App Store, Google Play) come from
  [Simple Icons](https://simpleicons.org/), released under
  [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md).
- The LinkedIn mark and the contact icons come from
  [Tabler Icons](https://tabler.io/icons), under the MIT licence in
  [LICENSE-tabler-icons.txt](LICENSE-tabler-icons.txt).
- The brand names and logos are trademarks of their owners and are used here
  only to link to a person's profile on that service.

## Making them again

`tools/icons/render.js` draws all of them with a headless browser:

```bash
cd tools/icons && npm install && npm run render
```
