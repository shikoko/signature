(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "gmail-signature-builder.v1";

  // The example person the page opens with. Fields still holding these values are flagged
  // so nobody pastes "Alex Rivera" into their Gmail by accident.
  const EXAMPLE_PHOTO = "https://shikoko.github.io/signature/assets/example-photo.png";
  const EXAMPLE = {
    name: "Alex Rivera",
    title: "Android Engineer",
    company: "Northwind Apps",
    photo: EXAMPLE_PHOTO,
    github: "example",
    linkedin: "example",
    instagram: "example",
    phone: "+44 20 7946 0958",
    website: "example.com",
    email: ""
  };
  const FIELD_LABELS = {
    name: "name", title: "job title", company: "company", photo: "photo",
    github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram",
    phone: "phone", website: "website", email: "email"
  };
  const DEFAULTS = Object.assign({}, EXAMPLE, { links: "words", accent: "#077a44" });

  const PRESETS = [
    { hex: "#077a44", name: "Android green, deepened" },
    { hex: "#0f766e", name: "Teal" },
    { hex: "#1d4ed8", name: "Cobalt" },
    { hex: "#4338ca", name: "Indigo" },
    { hex: "#374151", name: "Graphite" },
    { hex: "#3ddc84", name: "Android green" }
  ];

  // Gmail can't show SVG or embedded (data:) images, so logos are hosted PNGs.
  const ICON_URL = {
    github: "https://www.google.com/s2/favicons?domain=github.com&sz=64",
    linkedin: "https://www.google.com/s2/favicons?domain=linkedin.com&sz=64",
    instagram: "https://www.google.com/s2/favicons?domain=instagram.com&sz=64"
  };

  const FONT = "Helvetica,Arial,sans-serif";
  const INK = "#111a16", SUB = "#5f6b66", BODY = "#3a4541", RULE = "#d9dedc", SEP = "#b8c1bd";
  const GMAIL_LIMIT = 10000;
  const TABLE = 'cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"';

  let state = load();
  const photoStatus = {}; // photo URL -> "ok" | "error"

  // ---------- Storage (best effort: private windows may refuse it) ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") return Object.assign({}, DEFAULTS, saved);
      }
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULTS);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- Helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function cleanUrl(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }
  function social(v, re, make) {
    v = (v || "").trim();
    if (!v) return { url: "", handle: "" };
    const m = v.match(re);
    if (m) return { url: make(m[1]), handle: m[1] };
    const h = v.replace(/^@/, "");
    if (/^[A-Za-z0-9._-]+$/.test(h)) return { url: make(h), handle: h };
    return { url: cleanUrl(v), handle: "" };
  }
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrastOnWhite(hex) { return 1.05 / (luminance(hex) + 0.05); }
  function tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(v + (255 - v) * amount);
    return "#" + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
      .map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function validHex(h) { return /^#[0-9a-f]{6}$/i.test(h || ""); }
  function initials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (parts[0][0] + last).toUpperCase();
  }
  function exampleFieldsInUse() {
    return Object.keys(EXAMPLE).filter((k) => EXAMPLE[k] && state[k] === EXAMPLE[k]);
  }
  function listWords(words) {
    if (words.length <= 2) return words.join(" and ");
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }

  function model(s) {
    const gh = social(s.github, /github\.com\/([A-Za-z0-9-]+)/i, (h) => "https://github.com/" + h);
    const li = social(s.linkedin, /linkedin\.com\/in\/([^\/?#\s]+)/i, (h) => "https://www.linkedin.com/in/" + h);
    const ig = social(s.instagram, /instagram\.com\/([A-Za-z0-9._]+)/i, (h) => "https://www.instagram.com/" + h);
    const siteUrl = cleanUrl(s.website);
    return {
      name: (s.name || "").trim(),
      title: (s.title || "").trim(),
      company: (s.company || "").trim(),
      phone: (s.phone || "").trim(),
      email: (s.email || "").trim(),
      siteUrl: siteUrl,
      siteText: siteUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""),
      photo: cleanUrl(s.photo),
      githubHandle: gh.handle,
      socials: [
        { key: "github", label: "GitHub", url: gh.url },
        { key: "linkedin", label: "LinkedIn", url: li.url },
        { key: "instagram", label: "Instagram", url: ig.url }
      ],
      accent: validHex(s.accent) ? s.accent.toLowerCase() : DEFAULTS.accent,
      links: s.links === "logos" ? "logos" : "words"
    };
  }

  // ---------- Signature HTML (tables + inline styles: what Gmail keeps) ----------
  function socialRow(m, preview, size) {
    const items = m.socials.filter((x) => x.url || preview);
    if (!items.length) return "";
    if (m.links === "logos") {
      const cells = items.map((x) => {
        const img = '<img src="' + esc(ICON_URL[x.key]) + '" width="' + size + '" height="' + size + '" alt="' + x.label +
          '" style="display:block;width:' + size + "px;height:" + size + "px;border:0;" + (x.url ? "" : "opacity:0.28;") + '">';
        const inner = x.url
          ? '<a href="' + esc(x.url) + '" style="text-decoration:none;">' + img + "</a>"
          : '<span title="Add your ' + x.label + ' link">' + img + "</span>";
        return '<td style="padding:0 8px 0 0;vertical-align:middle;">' + inner + "</td>";
      }).join("");
      return "<table " + TABLE + "><tr>" + cells + "</tr></table>";
    }
    const sep = '<span style="color:' + SEP + ';">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>';
    return items.map((x) => x.url
      ? '<a href="' + esc(x.url) + '" style="color:' + m.accent + ';text-decoration:none;font-weight:bold;">' + x.label + "</a>"
      : '<span title="Add your ' + x.label + ' link" style="color:#a3ada9;font-weight:bold;border-bottom:1px dashed #c9d0cd;">' + x.label + "</span>"
    ).join(sep);
  }

  function contactRow(m) {
    const label = (l) => '<span style="color:' + m.accent + ';font-weight:bold;">' + l + "</span>&nbsp;&nbsp;";
    const link = (href, text) => '<a href="' + esc(href) + '" style="color:' + BODY + ';text-decoration:none;">' + esc(text) + "</a>";
    const parts = [];
    if (m.phone) parts.push(label("m") + link("tel:" + m.phone.replace(/[^\d+]/g, ""), m.phone));
    if (m.siteUrl) parts.push(label("w") + link(m.siteUrl, m.siteText));
    if (m.email) parts.push(label("e") + link("mailto:" + m.email, m.email));
    return parts.map((p) => '<span style="white-space:nowrap;">' + p + "</span>").join("&nbsp;&nbsp;&nbsp; ");
  }

  function titleLine(m) {
    const bits = [];
    if (m.title) bits.push('<span style="color:' + m.accent + ';font-weight:bold;">' + esc(m.title) + "</span>");
    if (m.company) bits.push('<span style="color:' + SUB + ';">' + esc(m.company) + "</span>");
    return bits.join('<span style="color:' + SEP + ';">&nbsp;&middot;&nbsp;</span>');
  }

  function photoImg(src, alt) {
    return '<img src="' + esc(src) + '" width="72" height="72" alt="' + esc(alt) +
      '" style="display:block;width:72px;height:72px;border-radius:36px;border:0;">';
  }

  function photoPlaceholder(m, missing) {
    const ring = missing ? "border:1.5px dashed " + m.accent + ";" : "";
    return '<div title="' + (missing ? "Add a photo link to include a photo" : "This photo link didn't load") +
      '" style="box-sizing:border-box;width:72px;height:72px;border-radius:50%;background:' + tint(m.accent, 0.9) + ";" + ring +
      "color:" + m.accent + ";font-family:" + FONT + ';font-size:22px;font-weight:bold;display:flex;align-items:center;justify-content:center;">' +
      esc(initials(m.name)) + "</div>";
  }

  function fullSig(m, preview) {
    const ff = "font-family:" + FONT + ";";
    let photo = "";
    if (m.photo && !(preview && photoStatus[m.photo] === "error")) {
      // The example photo ships with this site, so preview it from here (works before deploy and offline).
      const src = preview && m.photo === EXAMPLE_PHOTO ? "assets/example-photo.png" : m.photo;
      photo = photoImg(src, m.name).replace("<img ", preview ? '<img data-photo="' + esc(m.photo) + '" ' : "<img ");
    } else if (preview) {
      photo = photoPlaceholder(m, !m.photo);
    }
    const photoTd = photo ? '<td style="padding:0 16px 0 0;vertical-align:middle;">' + photo + "</td>" : "";
    const textStyle = photoTd
      ? "padding:2px 0 2px 16px;border-left:1px solid " + RULE + ";vertical-align:middle;"
      : "padding:0;vertical-align:top;";

    const rows = [];
    if (m.name) rows.push('<tr><td style="' + ff + "font-size:16px;line-height:21px;font-weight:bold;color:" + INK + ';">' + esc(m.name) + "</td></tr>");
    const tl = titleLine(m);
    if (tl) rows.push('<tr><td style="' + ff + 'font-size:13px;line-height:18px;">' + tl + "</td></tr>");
    const contacts = contactRow(m);
    if (contacts) rows.push('<tr><td style="' + ff + "font-size:12px;line-height:18px;color:" + SUB + ';padding-top:8px;">' + contacts + "</td></tr>");
    const socials = socialRow(m, preview, 18);
    if (socials) rows.push('<tr><td style="' + ff + "font-size:12px;line-height:16px;padding-top:" + (contacts ? 6 : 9) + 'px;">' + socials + "</td></tr>");

    return "<table " + TABLE + "><tr>" + photoTd + '<td style="' + textStyle + '"><table ' + TABLE + ">" + rows.join("") + "</table></td></tr></table>";
  }

  function replySig(m, preview) {
    const ff = "font-family:" + FONT + ";";
    const bits = [];
    if (m.name) bits.push('<span style="font-weight:bold;color:' + INK + ';">' + esc(m.name) + "</span>");
    const tl = titleLine(m);
    if (tl) bits.push(tl);
    const rows = [];
    if (bits.length) {
      rows.push('<tr><td style="' + ff + 'font-size:13px;line-height:18px;">' +
        bits.join('<span style="color:' + SEP + ';">&nbsp;&nbsp;|&nbsp;&nbsp;</span>') + "</td></tr>");
    }
    const socials = socialRow(m, preview, 16);
    if (socials) rows.push('<tr><td style="' + ff + 'font-size:12px;line-height:16px;padding-top:4px;">' + socials + "</td></tr>");
    return "<table " + TABLE + ">" + rows.join("") + "</table>";
  }

  function plainText(m, short) {
    const lines = [];
    if (m.name) lines.push(m.name);
    const t = [m.title, m.company].filter(Boolean).join(" · ");
    if (t) lines.push(t);
    if (!short) {
      const c = [m.phone && "m " + m.phone, m.siteText && "w " + m.siteText, m.email && "e " + m.email].filter(Boolean).join("   ");
      if (c) lines.push(c);
    }
    m.socials.filter((x) => x.url).forEach((x) => lines.push(x.label + ": " + x.url));
    return lines.join("\n");
  }

  // ---------- Form wiring ----------
  const inputs = Array.from(document.querySelectorAll("[data-key]"));
  function fillInputs() {
    inputs.forEach((el) => { el.value = state[el.dataset.key] || ""; });
  }
  fillInputs();
  inputs.forEach((el) => {
    el.addEventListener("input", () => { state[el.dataset.key] = el.value; save(); render(); });
  });

  $("linksWords").checked = state.links !== "logos";
  $("linksLogos").checked = state.links === "logos";
  document.querySelectorAll('input[name="links"]').forEach((r) =>
    r.addEventListener("change", () => { state.links = r.value; save(); render(); })
  );

  function buildSwatches() {
    const box = $("swatches");
    box.innerHTML = "";
    PRESETS.forEach((p, i) => {
      const label = document.createElement("label");
      label.className = "swatch";
      label.title = p.name;
      label.innerHTML = '<input type="radio" name="accent" id="accent' + i + '" value="' + p.hex + '" aria-label="' + esc(p.name) +
        '"><span style="background:' + p.hex + '"></span>';
      const input = label.querySelector("input");
      input.checked = p.hex === state.accent.toLowerCase();
      input.addEventListener("change", () => {
        state.accent = p.hex;
        $("accentCustom").value = p.hex;
        save(); render();
      });
      box.appendChild(label);
    });
    const custom = document.createElement("label");
    custom.className = "custom-color";
    custom.innerHTML = '<input type="color" id="accentCustom" aria-label="Pick any color"> Custom';
    box.appendChild(custom);
    const picker = custom.querySelector("input");
    picker.value = validHex(state.accent) ? state.accent : DEFAULTS.accent;
    picker.addEventListener("input", () => {
      state.accent = picker.value;
      document.querySelectorAll('input[name="accent"]').forEach((r) => { r.checked = r.value === picker.value.toLowerCase(); });
      save(); render();
    });
  }
  buildSwatches();

  $("useGithubAvatar").addEventListener("click", () => {
    const m = model(state);
    if (!m.githubHandle) return;
    state.photo = "https://github.com/" + m.githubHandle + ".png?size=200";
    $("photo").value = state.photo;
    save(); render();
  });

  $("clearExample").addEventListener("click", () => {
    exampleFieldsInUse().forEach((k) => { state[k] = ""; });
    save(); fillInputs(); render();
    $("name").focus();
  });

  // ---------- Render ----------
  function chip(text, ok, extra) {
    return '<span class="chip' + (ok ? " ok" : "") + (extra ? " " + extra : "") + '">' + esc(text) + "</span>";
  }

  let exportFull = "", exportReply = "", textFull = "", textReply = "";

  function watchPhoto(container) {
    const img = container.querySelector("img[data-photo]");
    if (!img) return;
    const url = img.getAttribute("data-photo");
    img.addEventListener("error", () => { photoStatus[url] = "error"; render(); }, { once: true });
    img.addEventListener("load", () => {
      if (photoStatus[url] !== "ok") { photoStatus[url] = "ok"; render(); }
    }, { once: true });
  }

  function render() {
    const m = model(state);
    $("previewFull").innerHTML = fullSig(m, true);
    $("previewReply").innerHTML = replySig(m, true);
    watchPhoto($("previewFull"));

    exportFull = fullSig(m, false);
    exportReply = replySig(m, false);
    textFull = plainText(m, false);
    textReply = plainText(m, true);
    updateSource();

    const ratio = contrastOnWhite(m.accent);
    const readable = ratio >= 4.5;
    $("accentNote").textContent = m.accent.toUpperCase() + " · " + ratio.toFixed(1) + ":1 on white" + (readable ? "" : " · too light for small text");

    const avatarBtn = $("useGithubAvatar");
    avatarBtn.disabled = !m.githubHandle;
    avatarBtn.textContent = m.githubHandle ? "Use my GitHub avatar (@" + m.githubHandle + ")" : "Use my GitHub avatar";

    $("linksHelp").textContent = m.links === "logos"
      ? "Logos are small images. Some mail apps hide them until the reader allows images."
      : "Plain text links. They show everywhere, even when images are blocked.";

    const examples = exampleFieldsInUse();
    $("exampleNote").hidden = examples.length === 0;
    $("exampleText").textContent = examples.length === Object.keys(EXAMPLE).filter((k) => EXAMPLE[k]).length
      ? "These are example details. Type over them, or clear them to start fresh."
      : "Still from the example: " + listWords(examples.map((k) => FIELD_LABELS[k])) + ".";

    const status = m.photo ? photoStatus[m.photo] : "";
    const checks = [];
    if (examples.length) checks.push(chip(examples.length + (examples.length === 1 ? " example detail" : " example details"), false));
    if (!m.photo) checks.push(chip("No photo link", false));
    else if (status === "error") checks.push(chip("Photo link didn't load", false));
    else checks.push(chip(status === "ok" ? "Photo loads" : "Photo link added", true));
    m.socials.forEach((x) => checks.push(chip(x.url ? x.label + " linked" : x.label + " missing", !!x.url)));
    checks.push(chip("Contrast " + ratio.toFixed(1) + ":1", readable, "num"));
    checks.push(chip(exportFull.length.toLocaleString("en-US") + " of " + GMAIL_LIMIT.toLocaleString("en-US") + " characters", exportFull.length <= GMAIL_LIMIT, "num"));
    $("checks").innerHTML = checks.join("");

    let note;
    if (!m.photo) note = "The dashed circle marks where your photo goes. ";
    else if (status === "error") note = "Your photo link didn't load here, so Gmail won't be able to show it either. Check that the link opens the image on its own. ";
    else note = "";
    $("photoNote").textContent = note + "Missing profiles show as faded words and are left out when you copy.";
  }

  function updateSource() {
    $("source").value = $("srcReply").checked ? exportReply : exportFull;
  }
  document.querySelectorAll('input[name="srcWhich"]').forEach((r) => r.addEventListener("change", updateSource));

  // ---------- Copy ----------
  function copyViaSelection(html) {
    const holder = document.createElement("div");
    holder.setAttribute("aria-hidden", "true");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;color:#222;";
    holder.innerHTML = html;
    document.body.appendChild(holder);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection.removeAllRanges();
    selection.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    selection.removeAllRanges();
    holder.remove();
    return ok;
  }

  async function copyRich(html, text) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })]);
        return true;
      }
    } catch (e) { /* fall through */ }
    return copyViaSelection(html);
  }

  function flash(el, ok, okText, badText, warn) {
    el.textContent = ok ? okText : badText;
    el.classList.toggle("bad", !ok || !!warn);
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.textContent = ""; el.classList.remove("bad"); }, ok && !warn ? 4000 : 9000);
  }

  function copyResultText() {
    return exampleFieldsInUse().length
      ? "Copied, but it still has example details."
      : "Copied. Paste it into Gmail.";
  }
  const BLOCKED = "Your browser blocked copying. Try Chrome, Edge or Firefox.";

  $("copyFull").addEventListener("click", async () => {
    const ok = await copyRich(exportFull, textFull);
    flash($("statusFull"), ok, copyResultText(), BLOCKED, exampleFieldsInUse().length > 0);
  });
  $("copyReply").addEventListener("click", async () => {
    const ok = await copyRich(exportReply, textReply);
    flash($("statusReply"), ok, copyResultText(), BLOCKED, exampleFieldsInUse().length > 0);
  });
  $("copySource").addEventListener("click", async () => {
    const area = $("source");
    let ok = false;
    try {
      await navigator.clipboard.writeText(area.value);
      ok = true;
    } catch (e) {
      area.focus();
      area.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    }
    flash($("statusSource"), ok, "HTML copied.", "Select the text and press Ctrl+C.");
  });

  render();
})();
