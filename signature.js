/* The signature: its details, and one renderer with three modes.
     "export"  the HTML copied into Gmail: tables, inline styles, hosted icons
     "preview" the same, with icons and the photo loaded from this site
     "edit"    the same layout, with editable text and clickable parts */
window.Signature = (function () {
  "use strict";

  const SITE = "https://shikoko.github.io/signature/";
  const ICONS = "icons/v1/";
  const EXAMPLE_PHOTO = SITE + "assets/example-photo.png";
  // Fonts that come with Windows, macOS and iOS, so readers see the signature in the same font.
  // Gmail removes web fonts from signatures, so a font only shows if the reader's device has it;
  // each list ends in a generic family, which is what Android and other devices fall back to.
  const FONTS = {
    helvetica: { label: "Helvetica", stack: "Helvetica,Arial,sans-serif" },
    verdana: { label: "Verdana", stack: "Verdana,Geneva,sans-serif" },
    trebuchet: { label: "Trebuchet", stack: "'Trebuchet MS',Tahoma,sans-serif" },
    georgia: { label: "Georgia", stack: "Georgia,'Times New Roman',serif" },
    palatino: { label: "Palatino", stack: "'Palatino Linotype',Palatino,'Book Antiqua',serif" }
  };
  const INK = "#111a16", SUB = "#5f6b66", BODY = "#3a4541", RULE = "#d9dedc", SEP = "#b8c1bd", FAINT = "#8a938f";
  const LIMIT = 10000;
  const TBL = 'cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"';

  const TYPES = {
    phone: { group: "contact", label: "Phone", ph: "+44 20 7946 0958" },
    email: { group: "contact", label: "Email", ph: "you@example.com" },
    website: { group: "contact", label: "Web", ph: "example.com" },
    address: { group: "contact", label: "Address", ph: "1 Example Street, London" },
    github: { group: "links", label: "GitHub", ph: "username", re: /github\.com\/([A-Za-z0-9-]+)/i, url: (h) => "https://github.com/" + h },
    linkedin: { group: "links", label: "LinkedIn", ph: "linkedin.com/in/your-name", re: /linkedin\.com\/in\/([^\/?#\s]+)/i, url: (h) => "https://www.linkedin.com/in/" + h },
    x: { group: "links", label: "X", ph: "@handle", re: /(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i, url: (h) => "https://x.com/" + h },
    bluesky: { group: "links", label: "Bluesky", ph: "you.bsky.social", re: /bsky\.app\/profile\/([^\/?#\s]+)/i, url: (h) => "https://bsky.app/profile/" + h },
    mastodon: { group: "links", label: "Mastodon", ph: "@you@mastodon.social" },
    instagram: { group: "links", label: "Instagram", ph: "@handle", re: /instagram\.com\/([A-Za-z0-9._]+)/i, url: (h) => "https://www.instagram.com/" + h },
    youtube: { group: "links", label: "YouTube", ph: "@channel", re: /youtube\.com\/@?([A-Za-z0-9._-]+)/i, url: (h) => "https://www.youtube.com/@" + h },
    dribbble: { group: "links", label: "Dribbble", ph: "username", re: /dribbble\.com\/([A-Za-z0-9_-]+)/i, url: (h) => "https://dribbble.com/" + h },
    medium: { group: "links", label: "Medium", ph: "@username", re: /medium\.com\/@?([A-Za-z0-9._-]+)/i, url: (h) => "https://medium.com/@" + h },
    stackoverflow: { group: "links", label: "Stack Overflow", ph: "stackoverflow.com/users/…", urlOnly: true },
    appstore: { group: "links", label: "App Store", ph: "apps.apple.com/app/…", urlOnly: true },
    googleplay: { group: "links", label: "Google Play", ph: "play.google.com/store/apps/…", urlOnly: true },
    booking: { group: "links", label: "Book a call", ph: "cal.com/you or calendly.com/you", urlOnly: true },
    custom: { group: "links", label: "Portfolio", ph: "https://…", urlOnly: true }
  };
  const OPTIONAL = { pronouns: "Pronouns", company: "Company", tagline: "Tagline", disclaimer: "Small print" };

  const EXAMPLE = {
    name: "Jane Doe", pronouns: "", title: "Android Engineer", company: "Northwind Apps", tagline: "", disclaimer: "",
    show: { pronouns: false, company: true, tagline: false, disclaimer: false },
    photo: EXAMPLE_PHOTO, localPhoto: "",
    items: [
      { id: "ex1", type: "phone", value: "+44 20 7946 0958", label: "Mobile" },
      { id: "ex2", type: "website", value: "example.com", label: "Web" },
      { id: "ex3", type: "github", value: "example" },
      { id: "ex4", type: "linkedin", value: "example" },
      { id: "ex5", type: "appstore", value: "apps.apple.com/app/example" }
    ],
    blocks: ["tagline", "contact", "links"],
    layout: "side", photoShape: "circle", photoSize: "M", showPhoto: true, divider: true,
    labels: "icons", contactAs: "lines", linksAs: "icons", iconStyle: "brand", font: "helvetica",
    accent: "#5b3fd6", edited: false
  };

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function cleanUrl(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }
  function linkUrl(item) {
    const t = TYPES[item.type], v = (item.value || "").trim();
    if (!v) return "";
    if (t.urlOnly) return cleanUrl(v);
    if (item.type === "mastodon") {
      const m = v.match(/^@?([^@\s\/]+)@([^@\s\/]+)$/);
      return m ? "https://" + m[2] + "/@" + m[1] : cleanUrl(v);
    }
    const m = v.match(t.re);
    if (m) return t.url(m[1]);
    const h = v.replace(/^@/, "");
    if (/^[A-Za-z0-9._-]+$/.test(h) && !/\.(com|org|net|io|dev|app|co)(\/|$)/i.test(h)) return t.url(h);
    return cleanUrl(v);
  }
  function githubHandle(st) {
    const gh = st.items.find((i) => i.type === "github" && i.value);
    const m = gh && linkUrl(gh).match(/github\.com\/([A-Za-z0-9-]+)/i);
    return m ? m[1] : "";
  }
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(hex) { return 1.05 / (luminance(hex) + 0.05); }
  function tint(hex, a) {
    const n = parseInt(hex.slice(1), 16), mix = (v) => Math.round(v + (255 - v) * a);
    return "#" + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function initials(name) {
    const p = String(name || "").split(/\s+/).filter(Boolean);
    return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "?";
  }
  function shown(st, key) { return !!(st.show[key] || (st[key] || "").trim()); }
  function iconPath(set, type) { return ICONS + set + "/" + type + ".png"; }
  // Where the photo loads from on this page: the example photo ships with the site.
  function photoSrc(st) { return st.photo === EXAMPLE_PHOTO ? "assets/example-photo.png" : cleanUrl(st.photo); }
  const uid = () => "i" + Math.random().toString(36).slice(2, 9);

  // ---------- renderer ----------
  // env.failed: photo links that didn't load in this browser, shown as initials instead.
  function render(st, mode, variant, env) {
    env = env || {};
    const edit = mode === "edit", exp = mode === "export";
    const acc = /^#[0-9a-f]{6}$/i.test(st.accent || "") ? st.accent : EXAMPLE.accent;
    const FONT = (FONTS[st.font] || FONTS.helvetica).stack;
    const ff = "font-family:" + FONT + ";";
    const CE = render.ce || "plaintext-only";

    function field(key, ph, style) {
      const v = st[key] || "";
      if (edit) return '<span class="ed" contenteditable="' + CE + '" spellcheck="false" data-key="' + key + '" data-ph="' + esc(ph) + '" style="' + style + '">' + esc(v) + "</span>";
      return v ? '<span style="' + style + '">' + esc(v) + "</span>" : "";
    }
    function iconSrc(type) {
      const set = st.iconStyle === "accent" ? "white" : st.iconStyle === "grey" ? "grey" : "brand";
      return exp ? SITE + iconPath(set, type) : iconPath(set, type);
    }
    // An icon, optionally in a circle of the accent colour. `fontSize` is the text it sits next to:
    // the icon is lowered so its centre meets the centre of the capitals and digits, not the
    // lower-case middle that vertical-align: middle uses.
    function icon(type, size, alt, fontSize) {
      const img = '<img src="' + esc(iconSrc(type)) + '" width="' + size + '" height="' + size + '" alt="' + esc(alt || "") +
        '" style="display:block;width:' + size + "px;height:" + size + 'px;border:0;">';
      const pad = st.iconStyle === "accent" ? Math.round(size * 0.32) : 0;
      const box = size + pad * 2;
      const va = fontSize ? Math.round(fontSize * 0.36 - box / 2) + "px" : "middle";
      const circle = pad ? "background-color:" + acc + ";border-radius:" + box + "px;padding:" + pad + "px;" : "";
      return '<span style="display:inline-block;vertical-align:' + va + ";" + circle + 'line-height:0;">' + img + "</span>";
    }

    // Identity
    let nameRow = field("name", "Your name", "font-size:16px;line-height:21px;font-weight:bold;color:" + INK + ";");
    if (shown(st, "pronouns")) {
      nameRow += '<span data-opt="pronouns" style="font-size:12px;color:' + SUB + ';font-weight:normal;">&nbsp;&nbsp;' + field("pronouns", "they/them", "") + "</span>";
    }
    let roleRow = field("title", "Job title", "color:" + acc + ";font-weight:bold;");
    if (shown(st, "company")) {
      const sep = (edit || (st.title && st.company)) ? '<span style="color:' + SEP + ';">&nbsp;&middot;&nbsp;</span>' : "";
      roleRow += '<span data-opt="company">' + sep + field("company", "Company", "color:" + SUB + ";") + "</span>";
    }
    const taglineRow = shown(st, "tagline") ? '<span data-opt="tagline">' + field("tagline", "A line about you or your work", "") + "</span>" : "";

    // Contact
    const contactItems = st.items.filter((i) => TYPES[i.type].group === "contact" && (edit || (i.value || "").trim()));
    function contactValue(i) {
      const v = (i.value || "").trim(), t = TYPES[i.type];
      if (edit) return '<span class="ed" contenteditable="' + CE + '" spellcheck="false" data-item-value="' + i.id + '" data-ph="' + esc(t.ph) + '">' + esc(i.value || "") + "</span>";
      const a = (href, text) => '<a href="' + esc(href) + '" style="color:' + BODY + ';text-decoration:none;">' + esc(text) + "</a>";
      if (i.type === "phone") return a("tel:" + v.replace(/[^\d+]/g, ""), v);
      if (i.type === "email") return a("mailto:" + v, v);
      if (i.type === "website") { const u = cleanUrl(v); return a(u, u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")); }
      return '<span style="color:' + BODY + ';">' + esc(v) + "</span>";
    }
    function contactLabel(i, inline) {
      const t = TYPES[i.type], text = i.label != null ? i.label : t.label;
      if (st.labels === "icons") return icon(i.type, 12, text, inline ? 12 : 0);
      if (st.labels === "words") {
        if (edit) return '<span class="ed lab" contenteditable="' + CE + '" spellcheck="false" data-item-label="' + i.id + '" data-ph="Label" style="color:' + acc + ';font-weight:bold;">' + esc(text) + "</span>";
        return text ? '<span style="color:' + acc + ';font-weight:bold;">' + esc(text) + "</span>" : "";
      }
      return "";
    }
    const itemAttr = (i) => edit ? ' data-item="' + i.id + '" data-group="' + TYPES[i.type].group + '"' : "";
    let contactHtml = "";
    if (contactItems.length) {
      if (st.contactAs === "lines" || st.layout === "columns") {
        contactHtml = "<table " + TBL + ">" + contactItems.map((i) => {
          const lab = contactLabel(i, false);
          return "<tr" + itemAttr(i) + ">" +
            (lab ? '<td style="' + ff + "padding:2px " + (st.labels === "icons" ? 8 : 10) + 'px 2px 0;vertical-align:middle;font-size:12px;line-height:18px;white-space:nowrap;">' + lab + "</td>" : "") +
            '<td style="' + ff + "padding:2px 0;vertical-align:middle;font-size:12px;line-height:18px;color:" + BODY + ';">' + contactValue(i) + "</td></tr>";
        }).join("") + "</table>";
      } else {
        contactHtml = contactItems.map((i) => {
          const lab = contactLabel(i, true);
          return '<span style="white-space:nowrap;"' + itemAttr(i) + ">" + (lab ? lab + "&nbsp;&nbsp;" : "") + contactValue(i) + "</span>";
        }).join("&nbsp;&nbsp;&nbsp; ");
      }
    }

    // Links
    function linksHtml(as) {
      const items = st.items.filter((i) => TYPES[i.type].group === "links" && (edit || linkUrl(i)));
      if (!items.length) return "";
      const label = (i) => i.text || TYPES[i.type].label;
      const wrap = (i, inner) => {
        if (edit) {
          const has = !!linkUrl(i);
          return '<span class="lnk' + (has ? "" : " missing") + '" role="button" tabindex="0" draggable="true"' + itemAttr(i) +
            ' title="Click to ' + (has ? "edit" : "add") + " your " + esc(label(i)) + ' link, or drag it to move it">' + inner + "</span>";
        }
        return '<a href="' + esc(linkUrl(i)) + '" style="color:' + acc + ';text-decoration:none;font-weight:bold;">' + inner + "</a>";
      };
      const word = (i) => '<span style="color:' + acc + ';font-weight:bold;">' + esc(label(i)) + "</span>";
      if (as === "words") {
        return items.map((i) => wrap(i, word(i))).join('<span style="color:' + SEP + ';">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>');
      }
      return "<table " + TBL + "><tr>" + items.map((i) => {
        const inner = as === "both"
          ? icon(i.type, st.iconStyle === "accent" ? 10 : 14, label(i), 12) + "&nbsp;&nbsp;" + word(i)
          : icon(i.type, st.iconStyle === "accent" ? 12 : 16, label(i), 0);
        return '<td style="' + ff + "padding:0 " + (as === "both" ? 14 : 6) + 'px 0 0;vertical-align:middle;font-size:12px;line-height:18px;white-space:nowrap;">' + wrap(i, inner) + "</td>";
      }).join("") + "</tr></table>";
    }

    // Photo
    const px = { S: 56, M: 72, L: 96 }[st.photoSize] || 72;
    function photo(size) {
      const s = size || px;
      const r = st.photoShape === "circle" ? Math.round(s / 2) : st.photoShape === "rounded" ? Math.round(s / 5) : 0;
      if (!st.showPhoto) return "";
      if (exp) {
        return st.photo ? '<img src="' + esc(cleanUrl(st.photo)) + '" width="' + s + '" height="' + s + '" alt="' + esc(st.name) +
          '" style="display:block;width:' + s + "px;height:" + s + "px;border-radius:" + r + 'px;border:0;">' : "";
      }
      // A photo chosen from the computer (st.localPhoto, a data: URL kept in this browser) is shown
      // here so people can see how it looks, but never copied: Gmail needs a link to an online image.
      const local = !st.photo && /^data:image\//.test(st.localPhoto || "") ? st.localPhoto : "";
      if (!st.photo && !local && !edit) return "";
      const src = local || (st.photo && !(env.failed && env.failed.has(cleanUrl(st.photo))) ? photoSrc(st) : "");
      const inner = src
        ? "<img" + (local ? "" : ' data-photo="' + esc(cleanUrl(st.photo)) + '"') + ' src="' + esc(src) + '" alt="" style="display:block;width:' + s + "px;height:" + s + "px;border-radius:" + r + 'px;object-fit:cover;">'
        : '<span style="display:block;width:100%;text-align:center;line-height:1;">' + esc(initials(st.name)) + "</span>";
      const base = "box-sizing:border-box;width:" + s + "px;height:" + s + "px;border-radius:" + r + "px;background:" + tint(acc, 0.9) + ";color:" + acc +
        ";font:bold " + Math.round(s * 0.3) + "px " + FONT + ";display:flex;align-items:center;justify-content:center;overflow:hidden;" +
        (st.photo || local ? "" : "border:1.5px dashed " + acc + ";");
      if (edit) return '<button type="button" class="photo-btn" aria-label="Change photo" title="Click to change the photo, or drop a picture onto the card" style="' + base + 'padding:0;cursor:pointer;">' + inner + "</button>";
      return '<div style="' + base + '">' + inner + "</div>";
    }

    // Text rows, in the chosen order
    const row = (html, pad, extra) => html ? '<tr><td style="' + ff + (pad ? "padding-top:" + pad + "px;" : "") + (extra || "") + '">' + html + "</td></tr>" : "";
    const identityRows = row(nameRow, 0, "font-size:16px;line-height:21px;") + row(roleRow, 0, "font-size:13px;line-height:18px;");
    const blockRow = {
      tagline: (pad) => row(taglineRow, pad == null ? 4 : pad, "font-size:12px;line-height:17px;color:" + SUB + ";"),
      contact: (pad) => row(contactHtml, pad == null ? 8 : pad, "font-size:12px;line-height:18px;color:" + SUB + ";"),
      links: (pad) => row(linksHtml(st.linksAs), pad == null ? 8 : pad, "font-size:12px;line-height:18px;")
    };
    const disclaimer = shown(st, "disclaimer")
      ? "<table " + TBL + '><tr><td data-opt="disclaimer" style="' + ff + "padding-top:12px;font-size:10px;line-height:14px;color:" + FAINT + ';max-width:520px;">' +
        field("disclaimer", "Small print, like a confidentiality note", "") + "</td></tr></table>" : "";

    const layout = variant === "reply" ? "compact" : st.layout;
    let body;
    if (layout === "compact") {
      const top = nameRow + (roleRow ? '<span style="color:' + SEP + ';">&nbsp;&nbsp;|&nbsp;&nbsp;</span>' + roleRow : "");
      const contactLine = variant === "reply" || !contactItems.length ? "" : contactItems.map((i) =>
        '<span style="white-space:nowrap;"' + itemAttr(i) + ">" + contactValue(i) + "</span>").join('<span style="color:' + SEP + ';">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>');
      body = "<table " + TBL + ">" + row(top, 0, "font-size:13px;line-height:21px;") + row(contactLine, 4, "font-size:12px;line-height:18px;") +
        row(linksHtml(variant === "reply" ? "words" : st.linksAs), 4, "font-size:12px;line-height:18px;") + "</table>";
    } else if (layout === "stacked") {
      const p = photo();
      const rule = st.divider ? '<tr><td style="padding:10px 0 2px;"><table ' + TBL + '><tr><td style="width:40px;height:2px;background-color:' + acc + ';font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>' : "";
      body = "<table " + TBL + ">" + (p ? '<tr><td style="padding-bottom:12px;">' + p + "</td></tr>" : "") + identityRows + rule +
        st.blocks.map((b) => blockRow[b]()).join("") + "</table>";
    } else if (layout === "columns") {
      const p = photo(Math.min(px, 64));
      const left = "<table " + TBL + "><tr>" + (p ? '<td style="padding-right:14px;vertical-align:middle;">' + p + "</td>" : "") +
        '<td style="vertical-align:middle;"><table ' + TBL + ">" + identityRows + blockRow.tagline() + "</table></td></tr></table>";
      const rightBlocks = st.blocks.filter((b) => b !== "tagline");
      const right = "<table " + TBL + ">" + rightBlocks.map((b, k) => blockRow[b](k === 0 ? 0 : 6)).join("") + "</table>";
      body = "<table " + TBL + '><tr><td style="vertical-align:middle;padding-right:20px;">' + left + "</td>" +
        '<td style="vertical-align:middle;padding-left:20px;' + (st.divider ? "border-left:1px solid " + RULE + ";" : "") + '">' + right + "</td></tr></table>";
    } else {
      const p = photo(), gap = px > 80 ? 20 : 16;
      body = "<table " + TBL + "><tr>" + (p ? '<td style="padding-right:' + gap + 'px;vertical-align:middle;">' + p + "</td>" : "") +
        '<td style="vertical-align:middle;' + (p && st.divider ? "border-left:1px solid " + RULE + ";padding-left:" + gap + "px;" : "") + '">' +
        "<table " + TBL + ">" + identityRows + st.blocks.map((b) => blockRow[b]()).join("") + "</table></td></tr></table>";
    }
    return body + (variant === "reply" ? "" : disclaimer);
  }

  function plainText(st, variant) {
    const lines = [];
    lines.push([st.name, (st.pronouns || "").trim() && "(" + st.pronouns.trim() + ")"].filter(Boolean).join(" "));
    const role = [st.title, shown(st, "company") && st.company].filter(Boolean).join(" · ");
    if (role) lines.push(role);
    if (variant !== "reply") {
      if ((st.tagline || "").trim()) lines.push(st.tagline.trim());
      st.items.filter((i) => TYPES[i.type].group === "contact" && (i.value || "").trim()).forEach((i) => {
        const lab = i.label != null ? i.label : TYPES[i.type].label;
        lines.push((st.labels === "words" && lab ? lab + ": " : "") + i.value.trim());
      });
    }
    st.items.filter((i) => TYPES[i.type].group === "links" && linkUrl(i)).forEach((i) => lines.push((i.text || TYPES[i.type].label) + ": " + linkUrl(i)));
    if (variant !== "reply" && (st.disclaimer || "").trim()) lines.push("", st.disclaimer.trim());
    return lines.filter((x, k) => x || k > 0).join("\n");
  }

  function copyViaSelection(html) {
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;color:#222;";
    holder.innerHTML = html;
    document.body.appendChild(holder);
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(holder);
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    sel.removeAllRanges();
    holder.remove();
    return ok;
  }
  async function copy(st, variant) {
    const html = render(st, "export", variant), text = plainText(st, variant);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })]);
        return true;
      }
    } catch (e) { /* fall back to selecting and copying */ }
    return copyViaSelection(html);
  }

  // Details are kept in this browser only. Private windows may refuse storage; the page still works.
  function load(key) {
    let st = JSON.parse(JSON.stringify(EXAMPLE));
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.items)) st = Object.assign(st, saved);
      }
    } catch (e) { /* ignore */ }
    return st;
  }
  function save(key, st) { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { /* ignore */ } }
  function examplesInUse(st) {
    let n = 0;
    ["name", "title", "company", "photo"].forEach((k) => { if (EXAMPLE[k] && st[k] === EXAMPLE[k]) n++; });
    EXAMPLE.items.forEach((ex) => { if (st.items.some((i) => i.id === ex.id && i.value === ex.value)) n++; });
    return n;
  }
  function clearExamples(st) {
    ["name", "title", "company", "photo"].forEach((k) => { if (st[k] === EXAMPLE[k]) st[k] = ""; });
    st.items = st.items.filter((i) => !EXAMPLE.items.some((ex) => ex.id === i.id && ex.value === i.value));
  }

  return {
    TYPES, OPTIONAL, EXAMPLE, FONTS, LIMIT,
    render, plainText, copy, load, save, examplesInUse, clearExamples,
    contrast, linkUrl, githubHandle, shown, uid, esc, iconPath, cleanUrl
  };
})();
