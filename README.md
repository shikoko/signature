# Gmail Signature Builder

Make a clean Gmail signature in a minute. Fill in your details, check the live preview, copy, and paste it into Gmail.

**Live:** https://shikoko.github.io/signature/

![Gmail Signature Builder, showing an example signature with a photo, name, job title and profile links](assets/social-preview.png)

## What it does

- Builds two signatures: a **full** one for new emails (photo, title, contact line, profile links) and a **short** one for replies, so long threads don't repeat the whole block.
- Copies them as rich text, ready to paste into Gmail's signature box. There's also an HTML source view for Apple Mail, Outlook and other apps.
- Checks the signature as you type. It flags missing profiles and photo links that don't load, checks the accent color's contrast against white, and keeps the size under Gmail's 10,000-character limit.
- Saves your details in your own browser (`localStorage`). Nothing is sent anywhere.

## Why it's built this way

- **Tables and inline styles only.** Gmail strips stylesheets, web fonts, SVG and embedded `data:` images from signatures. Everything here is plain tables, inline styles and Helvetica/Arial.
- **Profile links are words by default.** Outlook and many company mail servers block images, so logo icons often show up as empty boxes or attachments. Words always appear. Logos are available as an option; they're hosted PNGs, because Gmail can't show SVG.
- **Readable colors.** Bright brand colors are often too light for small text. Android green (`#3DDC84`) measures 1.8:1 against white, and small text needs about 4.5:1. The default accent is a deeper green at 5.4:1, and the page warns you when a custom color is too light.

## Adding it to Gmail

1. Click **Copy full signature**.
2. In Gmail: gear icon → **See all settings** → **General** → **Signature** → **Create new**. Paste it into the box.
3. Do the same with **Copy short signature**.
4. Under **Signature defaults**, choose the full one for new emails and the short one for replies.
5. Click **Save Changes** at the bottom of the page.

## Running it locally

It's a static site with no build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

## Files

- `index.html`: the page
- `styles.css`: page styles (light and dark)
- `app.js`: the form, signature HTML generation, checks and copy
- `assets/`: favicon, example photo and the social preview image

Made by [Bogdan Roatis](https://shikoko.github.io/), built with help from Claude.
