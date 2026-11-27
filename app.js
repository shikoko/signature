(function () {
  "use strict";

  const S = window.Signature, $ = (id) => document.getElementById(id);
  const KEY = "gmail-signature-builder.v3";
  // Version 2 opened with "Alex Rivera" and colour icons. Someone who made it their own keeps
  // their details; an untouched example is dropped, so the new example and defaults show.
  try {
    const old = localStorage.getItem("gmail-signature-builder.v2");
    if (old && !localStorage.getItem(KEY)) {
      const v2 = JSON.parse(old);
      if (v2 && Array.isArray(v2.items) && v2.name !== "Alex Rivera") localStorage.setItem(KEY, old);
    }
    localStorage.removeItem("gmail-signature-builder.v2");
  } catch (e) { /* storage refused: start from the example */ }
  const st = S.load(KEY);
  const failed = new Set(); // photo links that didn't load here
  const page = $("page"), sig = $("sig"), pop = $("pop"), bar = $("hoverbar"), sheet = $("sheet"), grip = $("grip");
  const stage = document.querySelector(".stage");
  let which = "full";
  let barFor = null; // the line or link the hover bar is showing for

  const svg = (d) => '<svg class="i" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  const ARROW = {
    up: svg("M8 13V3M4 7l4-4 4 4"),
    down: svg("M8 3v10M4 9l4 4 4-4"),
    left: svg("M13 8H3M7 4L3 8l4 4"),
    right: svg("M3 8h10M9 4l4 4-4 4")
  };

  // contenteditable="plaintext-only" keeps pasted formatting out; older browsers get "true" and a paste handler.
  S.render.ce = (() => {
    const d = document.createElement("div");
    try { d.contentEditable = "plaintext-only"; } catch (e) { return "true"; }
    return d.contentEditable === "plaintext-only" ? "plaintext-only" : "true";
  })();

  // In the page's dark menus, black and dark-grey icons use their white version so they show.
  const DARK_ICONS = new Set(["github", "x", "medium", "googleplay", "phone", "email", "website", "address", "booking", "custom"]);
  const uiIcon = (type) => S.iconPath(DARK_ICONS.has(type) ? "white" : "brand", type);
  const save = () => { st.edited = true; S.save(KEY, st); };
  const item = (id) => st.items.find((i) => i.id === id);
  const groupOf = (i) => S.TYPES[i.type].group;
  const env = { failed: failed };

  // ---------- render ----------
  function watchPhotos(root) {
    root.querySelectorAll("img[data-photo]").forEach((img) => {
      img.addEventListener("error", () => { failed.add(img.dataset.photo); renderAll(); }, { once: true });
    });
  }
  // The poster shows the signature larger than it will be in an email. Rather than CSS zoom,
  // which browsers size tables wrongly under, the edit view's pixel sizes are scaled directly.
  const scaleFor = () => {
    const w = window.innerWidth;
    if (!sheet.hidden && w > 600) return 1.25; // the Design panel shares the width
    return w > 960 ? 1.5 : w > 600 ? 1.25 : 1;
  };
  let scale = scaleFor();
  function scaled(html, k) {
    if (k === 1) return html;
    const px = (n) => String(Math.round(parseFloat(n) * k * 100) / 100);
    return html
      .replace(/style="([^"]*)"/g, (m, css) => 'style="' + css.replace(/(\d+(?:\.\d+)?)px/g, (x, n) => px(n) + "px") + '"')
      .replace(/ (width|height)="(\d+)"/g, (m, a, n) => " " + a + '="' + px(n) + '"');
  }
  function renderSig() {
    bar.hidden = true;
    grip.hidden = true;
    barFor = null;
    const html = S.render(st, "edit", "full", env);
    sig.innerHTML = scaled(html, scale);
    // A wide layout that doesn't fit at this size is shown smaller, never below real size,
    // so the whole signature stays in view.
    if (scale > 1 && sig.scrollWidth > sig.clientWidth + 1) {
      const k = Math.max(1, Math.floor((scale * sig.clientWidth / sig.scrollWidth) * 20) / 20);
      sig.innerHTML = scaled(html, k);
    }
    watchPhotos(sig);
  }
  // `keepPanel` leaves the Design panel as it is, for changes made from inside it that it shows already.
  function renderAll(keepPanel) {
    renderSig();
    $("addBtn").setAttribute("aria-expanded", !pop.hidden && pop.dataset.for === "add");
    $("alsoPreview").hidden = !alsoShown();
    if (alsoShown()) showEmail($("alsoBody"));
    document.querySelectorAll("[data-which]").forEach((b) => b.setAttribute("aria-checked", b.dataset.which === which));
    if (!sheet.hidden && !keepPanel) buildSheet();
    meta();
  }
  function showEmail(body) {
    const html = S.render(st, "preview", which, env);
    body.innerHTML = which === "reply"
      ? "<p>Sounds good. The crash fix goes out in Monday's build.</p>" + html +
        '<div class="quote">On Thu, Nov 26, 2026 at 6:04 PM Ana wrote:<br>Can we get the crash fix in before the release?</div>'
      : "<p>Hi Ana,</p><p>The TestFlight build with the new onboarding flow is up (1.8.0, build 412). Let me know if anything looks off on your device.</p><p>Thanks,</p>" +
        '<div class="sig-slot">' + html + "</div>";
    watchPhotos(body);
  }
  // The email preview shows while the Design panel is open, so each change can be seen at real
  // size. The rest of the time the page shows only the signature being edited.
  const alsoShown = () => !sheet.hidden;
  const localOnly = () => !st.photo && !!st.localPhoto && st.showPhoto;
  function say(text, bad) {
    const status = $("status");
    status.textContent = text;
    status.classList.toggle("bad", !!bad);
    clearTimeout(status._t);
    status._t = setTimeout(() => { status.textContent = ""; }, 6000);
  }
  // Problems that change what gets copied show just above the toolbar, with a dot on
  // "Copy signature" and a button that fixes them.
  function copyWarning() {
    if (localOnly()) return { text: "Your photo won't be in the copy: it's only on this computer.", fix: "Add a link" };
    if (st.photo && st.showPhoto && failed.has(S.cleanUrl(st.photo))) {
      return { text: "Your photo link didn't load here, so it may not show in Gmail either.", fix: "Change the link" };
    }
    return null;
  }
  function dockNote() {
    const w = copyWarning(), note = $("dockNote");
    note.hidden = !w;
    if (w) {
      $("dockNoteText").textContent = w.text;
      $("dockFix").textContent = w.fix;
      $("copyFull").setAttribute("data-warn", "");
    } else {
      $("copyFull").removeAttribute("data-warn");
    }
    document.documentElement.style.setProperty("--note-space", w ? note.offsetHeight + 8 + "px" : "0px");
  }
  function meta() {
    const ex = S.examplesInUse(st), r = S.contrast(st.accent), size = S.render(st, "export", "full").length;
    const parts = [];
    if (ex) parts.push('<span>Example details: <button type="button" id="clear">clear them</button></span>');
    parts.push('<span class="' + (r < 4.5 ? "bad" : "") + '">' + r.toFixed(1) + ":1 contrast" + (r < 4.5 ? ", too light" : "") + "</span>");
    parts.push('<span class="' + (size > S.LIMIT ? "bad" : "") + '">' + size.toLocaleString("en-GB") + " / " + S.LIMIT.toLocaleString("en-GB") + " characters</span>");
    $("meta").innerHTML = parts.join("");
    dockNote();
    const clear = $("clear");
    if (clear) clear.addEventListener("click", () => {
      S.clearExamples(st); save(); renderAll();
      const n = sig.querySelector('[data-key="name"]');
      if (n) n.focus();
    });
  }

  // ---------- typing in the signature ----------
  sig.addEventListener("input", (e) => {
    const el = e.target.closest(".ed");
    if (!el) return;
    const text = el.textContent.replace(/\n/g, " ");
    if (!text) el.innerHTML = "";
    if (el.dataset.key) st[el.dataset.key] = text;
    else if (el.dataset.itemValue) item(el.dataset.itemValue).value = text;
    else if (el.dataset.itemLabel) item(el.dataset.itemLabel).label = text;
    save();
    if (alsoShown()) showEmail($("alsoBody"));
    meta();
  });
  sig.addEventListener("keydown", (e) => {
    if (e.target.closest(".ed") && e.key === "Enter") { e.preventDefault(); e.target.blur(); }
    const l = e.target.closest(".lnk");
    if (l && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLink(l.dataset.item, l); }
  });
  sig.addEventListener("paste", (e) => {
    if (S.render.ce === "plaintext-only" || !e.target.closest(".ed")) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain").replace(/\n/g, " ");
    document.execCommand("insertText", false, text);
  });
  // Leaving the signature tidies it: empty contact lines and empty optional fields go away.
  sig.addEventListener("focusout", (e) => {
    const to = e.relatedTarget;
    if (to && (sig.contains(to) || bar.contains(to) || pop.contains(to))) return;
    setTimeout(() => { if (!sig.contains(document.activeElement)) tidy(); }, 0);
  });
  function tidy() {
    const before = JSON.stringify(st);
    st.items = st.items.filter((i) => groupOf(i) !== "contact" || (i.value || "").trim());
    Object.keys(S.OPTIONAL).forEach((k) => { if (!(st[k] || "").trim()) { st.show[k] = false; st[k] = ""; } });
    if (JSON.stringify(st) !== before) { save(); renderAll(); }
  }
  sig.addEventListener("click", (e) => {
    const l = e.target.closest(".lnk");
    if (l) { openLink(l.dataset.item, l); return; }
    const p = e.target.closest(".photo-btn");
    if (p) openPhoto(p);
  });

  // ---------- hovering a line: move or remove it, and a handle to drag it ----------
  let hideTimer = null, dragId = null;
  const target = (el) => (el && el.closest ? el.closest("[data-item], [data-opt]") : null);
  function showBar(el) {
    if (!el || dragId) return;
    if (!pop.hidden && pop.dataset.for === (el.dataset.item || el.dataset.opt)) return;
    clearTimeout(hideTimer);
    sig.querySelectorAll(".hl").forEach((x) => x.classList.remove("hl"));
    el.classList.add("hl");
    barFor = el;
    const isItem = !!el.dataset.item, vertical = el.tagName === "TR";
    $("hbPrev").hidden = $("hbNext").hidden = !isItem;
    $("hbPrev").innerHTML = vertical ? ARROW.up : ARROW.left;
    $("hbNext").innerHTML = vertical ? ARROW.down : ARROW.right;
    $("hbPrev").setAttribute("aria-label", vertical ? "Move up" : "Move left");
    $("hbNext").setAttribute("aria-label", vertical ? "Move down" : "Move right");
    if (isItem) {
      const sib = st.items.filter((i) => groupOf(i) === el.dataset.group);
      const k = sib.findIndex((i) => i.id === el.dataset.item);
      $("hbPrev").disabled = k <= 0;
      $("hbNext").disabled = k >= sib.length - 1;
    }
    bar.hidden = false;
    const pr = page.getBoundingClientRect(), r = el.getBoundingClientRect();
    bar.style.left = Math.max(8, Math.min(r.left - pr.left, pr.width - bar.offsetWidth - 8)) + "px";
    bar.style.top = (r.top - pr.top - bar.offsetHeight - 6) + "px";
    // Contact lines get a handle beside them; links are dragged by the link itself.
    grip.hidden = !(isItem && el.dataset.group === "contact");
    if (!grip.hidden) {
      grip.style.left = Math.max(4, r.left - pr.left - grip.offsetWidth - 4) + "px";
      grip.style.top = (r.top - pr.top + r.height / 2 - grip.offsetHeight / 2) + "px";
    }
  }
  function hideBar(now) {
    clearTimeout(hideTimer);
    const go = () => {
      if (dragId) return;
      bar.hidden = true;
      grip.hidden = true;
      barFor = null;
      sig.querySelectorAll(".hl").forEach((x) => x.classList.remove("hl"));
    };
    if (now) go(); else hideTimer = setTimeout(go, 350);
  }
  sig.addEventListener("mouseover", (e) => { const t = target(e.target); if (t) showBar(t); });
  sig.addEventListener("mouseleave", () => hideBar());
  sig.addEventListener("focusin", (e) => { const t = target(e.target); if (t) showBar(t); });
  [bar, grip].forEach((x) => {
    x.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    x.addEventListener("mouseleave", () => hideBar());
  });

  function swap(i, other) {
    const a = st.items.indexOf(i), b = st.items.indexOf(other);
    st.items[a] = other;
    st.items[b] = i;
  }
  function move(id, dir) {
    const i = item(id), sib = st.items.filter((x) => groupOf(x) === groupOf(i)), other = sib[sib.indexOf(i) + dir];
    if (!other) return;
    swap(i, other);
    save(); renderAll();
    const el = sig.querySelector('[data-item="' + id + '"]');
    if (el) showBar(el);
  }
  $("hbPrev").addEventListener("click", () => { if (barFor && barFor.dataset.item) move(barFor.dataset.item, -1); });
  $("hbNext").addEventListener("click", () => { if (barFor && barFor.dataset.item) move(barFor.dataset.item, 1); });
  $("hbRemove").addEventListener("click", () => {
    if (!barFor) return;
    if (barFor.dataset.item) st.items = st.items.filter((i) => i.id !== barFor.dataset.item);
    else { st.show[barFor.dataset.opt] = false; st[barFor.dataset.opt] = ""; }
    save(); hideBar(true); renderAll();
  });

  // Dragging: a contact line by the handle beside it, a link by the link itself, onto
  // another line or link of the same kind. The dragged element is only dimmed, never
  // hidden, because hiding it cancels the drag in some browsers.
  function startDrag(e, el) {
    dragId = el.dataset.item;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
    try { e.dataTransfer.setDragImage(el, 10, 10); } catch (err) { /* the browser's own image will do */ }
    el.classList.add("dragging");
    grip.classList.add("active");
    bar.hidden = true;
  }
  const clearDrop = () => sig.querySelectorAll(".drop-before, .drop-after").forEach((x) => x.classList.remove("drop-before", "drop-after"));
  function endDrag() {
    dragId = null;
    clearDrop();
    sig.querySelectorAll(".dragging").forEach((x) => x.classList.remove("dragging"));
    grip.classList.remove("active");
    hideBar(true);
  }
  grip.addEventListener("dragstart", (e) => {
    if (!barFor || !barFor.dataset.item) { e.preventDefault(); return; }
    startDrag(e, barFor);
  });
  sig.addEventListener("dragstart", (e) => {
    const l = e.target.closest ? e.target.closest(".lnk[data-item]") : null;
    if (l) startDrag(e, l);
    else e.preventDefault(); // no dragging text or pictures out of the signature
  });
  sig.addEventListener("dragover", (e) => {
    if (!dragId) return;
    const t = e.target.closest("[data-item]");
    clearDrop();
    if (!t || t.dataset.item === dragId || t.dataset.group !== groupOf(item(dragId))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = t.getBoundingClientRect();
    const before = t.tagName === "TR" ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
    t.classList.add(before ? "drop-before" : "drop-after");
  });
  sig.addEventListener("drop", (e) => {
    const t = sig.querySelector(".drop-before, .drop-after");
    if (!dragId || !t) return;
    e.preventDefault();
    const moving = item(dragId), before = t.classList.contains("drop-before");
    st.items = st.items.filter((i) => i !== moving);
    const at = st.items.findIndex((i) => i.id === t.dataset.item);
    st.items.splice(before ? at : at + 1, 0, moving);
    endDrag();
    save(); renderAll();
  });
  document.addEventListener("dragend", endDrag);

  // ---------- pop-ups ----------
  // Opens under the anchor unless there's more room above it; the bottom toolbar counts as no room.
  // With `below`, it always opens under the anchor and the page scrolls just enough to show it.
  function placePop(anchor, preferAbove, below, alignEnd) {
    pop.hidden = false;
    const pr = page.getBoundingClientRect(), r = anchor.getBoundingClientRect(), h = pop.offsetHeight;
    const roomBelow = window.innerHeight - 110 - r.bottom, roomAbove = r.top - 8;
    const above = !below && (preferAbove ? roomAbove >= h + 10 || roomAbove > roomBelow : roomBelow < h + 10 && roomAbove > roomBelow);
    const x = alignEnd ? r.right - pr.left - pop.offsetWidth : r.left - pr.left + r.width / 2 - pop.offsetWidth / 2;
    pop.style.left = Math.max(12, Math.min(x, pr.width - pop.offsetWidth - 12)) + "px";
    pop.style.top = Math.max(8, above ? r.top - pr.top - h - 10 : r.bottom - pr.top + 10) + "px";
    const hidden = pop.getBoundingClientRect().bottom - (window.innerHeight - 110);
    if (below && hidden > 0) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: Math.min(hidden + 8, r.top - 8), behavior: reduce ? "auto" : "smooth" });
    }
  }
  function closePop() {
    if (pop.hidden) return;
    const id = pop.dataset.for;
    pop.hidden = true;
    pop.classList.remove("wide");
    pop.dataset.for = "";
    const i = id && item(id);
    if (i && groupOf(i) === "links" && !(i.value || "").trim()) { st.items = st.items.filter((x) => x !== i); save(); }
    renderAll();
  }
  document.addEventListener("mousedown", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest(".lnk, .photo-btn, #addBtn")) closePop();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!pop.hidden) closePop();
    if (!sheet.hidden && sheet.contains(document.activeElement)) { toggleSheet(false); $("designBtn").focus(); }
  });
  window.addEventListener("resize", () => {
    if (!pop.hidden) closePop();
    hideBar(true);
    if (!sig.contains(document.activeElement)) { scale = scaleFor(); renderAll(); }
  });

  function openLink(id, anchor) {
    const i = item(id), t = S.TYPES[i.type];
    const sib = st.items.filter((x) => groupOf(x) === "links"), k = sib.indexOf(i);
    hideBar(true);
    pop.dataset.for = id;
    pop.classList.remove("wide");
    pop.innerHTML = '<h3><img src="' + uiIcon(i.type) + '" alt="">' + S.esc(t.label) + "</h3>" +
      '<label>Link<input id="pv" autocomplete="off" placeholder="' + S.esc(t.ph) + '"></label>' +
      '<label>Shown as<input id="pt" autocomplete="off" placeholder="' + S.esc(t.label) + '"></label>' +
      '<div class="row"><span class="mv"><button type="button" class="ib" id="pl" aria-label="Move left"' + (k <= 0 ? " disabled" : "") + ">" + ARROW.left + "</button>" +
      '<button type="button" class="ib" id="pr" aria-label="Move right"' + (k >= sib.length - 1 ? " disabled" : "") + ">" + ARROW.right + "</button></span>" +
      '<span><button type="button" class="link rm" id="prm">Remove</button><button type="button" class="done" id="pd">Done</button></span></div>';
    $("pv").value = i.value || "";
    $("pt").value = i.text || "";
    $("pv").addEventListener("input", (e) => { i.value = e.target.value; save(); meta(); });
    $("pt").addEventListener("input", (e) => { i.text = e.target.value; save(); renderSig(); meta(); });
    [$("pv"), $("pt")].forEach((x) => x.addEventListener("keydown", (e) => { if (e.key === "Enter") closePop(); }));
    $("pd").addEventListener("click", closePop);
    $("prm").addEventListener("click", () => {
      st.items = st.items.filter((x) => x !== i);
      save(); pop.hidden = true; pop.dataset.for = ""; renderAll();
    });
    const mv = (d) => {
      const other = sib[k + d];
      if (!other) return;
      swap(i, other);
      save(); renderAll();
      const el = sig.querySelector('[data-item="' + id + '"]');
      if (el) openLink(id, el);
    };
    $("pl").addEventListener("click", () => mv(-1));
    $("pr").addEventListener("click", () => mv(1));
    placePop(anchor);
    $("pv").focus();
  }

  const PHOTO_NOTE = {
    link: "A square image works best. It has to be online, so paste a link to it. To reuse your current photo, right-click it in Gmail's signature settings and choose Copy image address.",
    local: "This photo is only on this computer. It shows here so you can see how it looks, but Gmail needs a link to a photo that's online, so it isn't copied. Paste a link above to include it."
  };
  function openPhoto(anchor) {
    const gh = S.githubHandle(st);
    hideBar(true);
    pop.dataset.for = "photo";
    pop.classList.remove("wide");
    pop.innerHTML = "<h3>Photo</h3>" +
      '<label>Photo link<input id="pp" autocomplete="off" placeholder="https://…/photo.jpg"></label>' +
      '<div class="row"><span><button type="button" class="link" id="pfile">Choose from this computer</button>' +
      (gh ? '<button type="button" class="link" id="pgh">Use my GitHub avatar</button>' : "") + "</span></div>" +
      '<input type="file" id="pfileInput" accept="image/*" hidden>' +
      '<p class="note" id="pnote"></p>' +
      '<div class="row"><span></span><span><button type="button" class="link rm" id="prm">Remove</button><button type="button" class="done" id="pd">Done</button></span></div>';
    const note = () => { $("pnote").textContent = localOnly() ? PHOTO_NOTE.local : PHOTO_NOTE.link; };
    note();
    $("pp").value = st.photo || "";
    $("pp").addEventListener("input", (e) => {
      st.photo = e.target.value.trim();
      if (st.photo) st.localPhoto = "";
      save(); note(); meta();
    });
    $("pp").addEventListener("keydown", (e) => { if (e.key === "Enter") closePop(); });
    $("pfile").addEventListener("click", () => $("pfileInput").click());
    $("pfileInput").addEventListener("change", (e) => {
      if (e.target.files[0]) useLocalPhoto(e.target.files[0], () => { $("pp").value = ""; note(); });
    });
    if (gh) $("pgh").addEventListener("click", () => {
      st.photo = "https://github.com/" + gh + ".png?size=200";
      st.localPhoto = "";
      $("pp").value = st.photo;
      save(); note(); meta();
    });
    $("prm").addEventListener("click", () => { st.photo = ""; st.localPhoto = ""; save(); closePop(); });
    $("pd").addEventListener("click", closePop);
    placePop(anchor);
    $("pp").focus();
  }

  // A picture from this computer is cropped square, shrunk to 192 px and kept in this browser
  // only. It's shown in the editor and the email preview but never copied.
  function useLocalPhoto(file, done) {
    if (!file || !/^image\//.test(file.type)) { say("That file isn't a picture. Choose a JPEG, PNG, GIF or WebP image.", true); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const size = 192, side = Math.min(img.naturalWidth, img.naturalHeight), canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      st.localPhoto = canvas.toDataURL("image/jpeg", 0.86);
      st.photo = "";
      st.showPhoto = true;
      save(); renderAll();
      if (done) done();
    };
    img.onerror = () => { URL.revokeObjectURL(url); say("That picture couldn't be opened. Try a JPEG or PNG.", true); };
    img.src = url;
  }
  // Dropping a picture anywhere on the card uses it as the photo.
  const card = $("card");
  const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
  card.addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    card.classList.add("drop-photo");
  });
  card.addEventListener("dragleave", (e) => { if (!card.contains(e.relatedTarget)) card.classList.remove("drop-photo"); });
  card.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    card.classList.remove("drop-photo");
    useLocalPhoto(e.dataTransfer.files[0]);
  });
  // A file dropped anywhere else would otherwise replace this page.
  ["dragover", "drop"].forEach((type) => document.addEventListener(type, (e) => { if (hasFiles(e)) e.preventDefault(); }));

  const ADD_GROUPS = [
    ["Contact", ["phone", "email", "website", "address"]],
    ["Profiles", ["github", "linkedin", "x", "bluesky", "mastodon", "instagram", "youtube", "dribbble", "medium", "stackoverflow"]],
    ["Apps and links", ["appstore", "googleplay", "booking", "custom"]]
  ];
  function openAdd(anchor) {
    const extras = Object.keys(S.OPTIONAL).filter((k) => !S.shown(st, k));
    hideBar(true);
    pop.dataset.for = "add";
    pop.classList.add("wide");
    pop.innerHTML = "<h3>Add to your signature</h3>" + ADD_GROUPS.map(([g, types]) =>
      '<div class="grp">' + g + '</div><div class="opts">' + types.map((t) =>
        '<button type="button" data-add="' + t + '"><img src="' + uiIcon(t) + '" alt="">' + S.esc(S.TYPES[t].label) + "</button>").join("") + "</div>").join("") +
      (extras.length ? '<div class="grp">Extras</div><div class="opts">' + extras.map((k) =>
        '<button type="button" data-opt-add="' + k + '"><span class="dot"></span>' + S.OPTIONAL[k] + "</button>").join("") + "</div>" : "");
    pop.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => addItem(b.dataset.add)));
    pop.querySelectorAll("[data-opt-add]").forEach((b) => b.addEventListener("click", () => {
      st.show[b.dataset.optAdd] = true;
      save(); pop.hidden = true; pop.dataset.for = ""; renderAll();
      const el = sig.querySelector('[data-key="' + b.dataset.optAdd + '"]');
      if (el) el.focus();
    }));
    placePop(anchor, false, true, true);
    $("addBtn").setAttribute("aria-expanded", "true");
  }
  function addItem(type) {
    const t = S.TYPES[type], it = { id: S.uid(), type: type, value: "" };
    if (t.group === "contact") it.label = t.label;
    st.items.splice(st.items.map(groupOf).lastIndexOf(t.group) + 1, 0, it);
    save(); pop.hidden = true; pop.dataset.for = ""; renderAll();
    if (t.group === "contact") {
      const el = sig.querySelector('[data-item-value="' + it.id + '"]');
      if (el) el.focus();
    } else {
      const el = sig.querySelector('.lnk[data-item="' + it.id + '"]');
      if (el) openLink(it.id, el);
    }
  }
  $("addBtn").addEventListener("click", (e) => {
    if (!pop.hidden && pop.dataset.for === "add") closePop(); else openAdd(e.currentTarget);
  });

  // ---------- Design panel ----------
  const LAYOUTS = [["side", "Side by side"], ["stacked", "Stacked"], ["columns", "Two columns"], ["compact", "Compact"]];
  // Twelve clearly different colours: violet, blue, teal, green, olive and orange, then red, pink,
  // plum, brown, slate and near-black. Every one is at least 4.5:1 against white, so small text
  // in it stays easy to read.
  const COLOURS = ["#5b3fd6", "#1d4ed8", "#0e7490", "#087a45", "#4d7c0f", "#a35400", "#b91c1c", "#c2185b", "#86198f", "#78350f", "#374151", "#111827"];
  const TABS = [["layout", "Layout"], ["colour", "Colour"], ["text", "Text"], ["icons", "Icons"], ["photo", "Photo"]];
  let tab = "layout";
  const current = (set) => set === "photoShape" ? (st.showPhoto ? st.photoShape : "none") : set === "divider" ? (st.divider ? "on" : "off") : st[set];
  const radio = (set, v, cls, inner, title) => '<button type="button"' + (cls ? ' class="' + cls + '"' : "") + ' role="radio" data-set="' + set + '" data-val="' + v + '" aria-checked="' + (current(set) === v) + '"' +
    (title ? ' title="' + title + '"' : "") + ">" + inner + "</button>";
  const seg = (set, opts) => '<div class="dseg" role="radiogroup">' + opts.map(([v, label, title]) => radio(set, v, "", label, title)).join("") + "</div>";
  const opt = (label, html, wide) => '<div class="opt' + (wide ? " wide" : "") + '"><span>' + label + "</span>" + html + "</div>";
  // The Icons tab shows the same generic link icon in each style.
  const LINK_PATHS = '<path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>';
  const linkIcon = (stroke, defs) => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="' + stroke +
    '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (defs || "") + LINK_PATHS + "</svg>";
  const BRAND_SAMPLE = linkIcon("url(#iconSampleBrand)", '<defs><linearGradient id="iconSampleBrand" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="20" y2="20"><stop offset="0" stop-color="#1fb5ff"/><stop offset=".5" stop-color="#ff4f9a"/><stop offset="1" stop-color="#ffad1f"/></linearGradient></defs>');
  function contrastNote() {
    const r = S.contrast(st.accent), n = r.toFixed(1) + ":1";
    return r < 4.5 ? { bad: true, text: "Too light to read easily on white (" + n + "). Try a darker colour." } : { bad: false, text: "Easy to read on white (" + n + ")." };
  }
  const PAGES = {
    layout: () => {
      const names = { tagline: "Tagline", contact: "Contact", links: "Links" };
      return opt("Layout", '<div class="layout-grid" role="radiogroup" aria-label="Layout">' + LAYOUTS.map(([v, l]) =>
          radio("layout", v, "layout-pick", '<span class="thumb" aria-hidden="true"></span><span class="layout-name">' + l + "</span>")).join("") + "</div>", true) +
        opt("Divider", seg("divider", [["on", "Show"], ["off", "Hide"]])) +
        opt("Order", '<div class="order">' + st.blocks.map((b, k) =>
          "<div>" + names[b] + "<span>" +
          '<button type="button" class="ib" data-ord="' + k + '" data-dir="-1" aria-label="Move ' + names[b] + ' up"' + (k === 0 ? " disabled" : "") + ">" + ARROW.up + "</button>" +
          '<button type="button" class="ib" data-ord="' + k + '" data-dir="1" aria-label="Move ' + names[b] + ' down"' + (k === st.blocks.length - 1 ? " disabled" : "") + ">" + ARROW.down + "</button>" +
          "</span></div>").join("") + "</div>", true);
    },
    colour: () => {
      const c = contrastNote();
      return '<div class="sws" role="radiogroup" aria-label="Colour">' + COLOURS.map((hex) =>
          '<button type="button" class="sw" role="radio" aria-label="' + hex + '" data-set="accent" data-val="' + hex + '" aria-checked="' + (st.accent.toLowerCase() === hex) + '" style="background:' + hex + '"></button>').join("") + "</div>" +
        '<label class="any-colour"><input type="color" id="customColor" value="' + S.esc(st.accent) + '">Any colour</label>' +
        '<p class="contrast' + (c.bad ? " bad" : "") + '" id="contrast">' + c.text + "</p>";
    },
    text: () => {
      const sample = S.esc((st.name || "").trim() || "Your name");
      return opt("Font", '<div class="fonts" role="radiogroup" aria-label="Font">' + Object.keys(S.FONTS).map((k) =>
          radio("font", k, "", '<span class="sample" style="font-family:' + S.FONTS[k].stack + '">' + sample + '</span><span class="fname">' + S.FONTS[k].label + "</span>")).join("") + "</div>" +
          '<p class="hint">Fonts that come with computers and phones, so people see your signature as you do.</p>', true) +
        opt("Labels", seg("labels", [["icons", "Icons"], ["words", "Words"], ["none", "None"]])) +
        opt("Contact", seg("contactAs", [["lines", "One per line"], ["inline", "On one line"]]));
    },
    icons: () => opt("Icon colours", '<div class="istyles" role="radiogroup" aria-label="Icon colours">' +
        radio("iconStyle", "brand", "", BRAND_SAMPLE + "Brand", "Each logo in its own colours") +
        radio("iconStyle", "grey", "", linkIcon("#8b93a3") + "Grey", "Every icon in grey") +
        radio("iconStyle", "accent", "", '<span class="chip" style="background:' + S.esc(st.accent) + '">' + linkIcon("#fff") + "</span>Colour", "White icons on your colour") + "</div>", true) +
      opt("Links", seg("linksAs", [["icons", "Icons"], ["words", "Words"], ["both", "Both"]])),
    photo: () => opt("Shape", seg("photoShape", [["circle", "Circle"], ["rounded", "Rounded"], ["square", "Square"], ["none", "None"]])) +
      opt("Size", seg("photoSize", [["S", "Small"], ["M", "Medium"], ["L", "Large"]])) +
      '<p class="hint">To change the picture, click it on your signature.</p>'
  };
  // A small picture of a signature, fitted to its box and never larger than `max` times real
  // size. Its links become plain text, as pictures sit inside buttons and cards.
  function picture(box, html, max) {
    box.innerHTML = '<div class="tin">' + html.replace(/<a /g, "<span ").replace(/<\/a>/g, "</span>") + "</div>";
    const t = box.firstChild, w = t.offsetWidth, h = t.offsetHeight;
    if (!w || !h) return;
    const k = Math.min((box.clientWidth - 16) / w, (box.clientHeight - 12) / h, max);
    t.style.transform = "scale(" + k + ")";
    t.style.left = (box.clientWidth - w * k) / 2 + "px";
    t.style.top = (box.clientHeight - h * k) / 2 + "px";
  }
  // Each layout is drawn small from the person's own signature, changing only the layout, so
  // each picture keeps their colour, icons, font, labels and photo.
  function drawLayouts() {
    sheet.querySelectorAll('[data-set="layout"]').forEach((b) =>
      picture(b.querySelector(".thumb"), S.render(Object.assign({}, st, { layout: b.dataset.val }), "preview", "full", env), 0.6));
  }
  function buildSheet() {
    // Rebuilding would lose the panel's scroll position and the focused button, so keep both.
    const scrollTop = sheet.scrollTop, f = sheet.contains(document.activeElement) ? document.activeElement : null;
    const refocus = f && (f.dataset.set ? '[data-set="' + f.dataset.set + '"][data-val="' + f.dataset.val + '"]'
      : f.dataset.ord != null ? '[data-ord="' + f.dataset.ord + '"][data-dir="' + f.dataset.dir + '"]'
      : f.dataset.tab ? '[data-tab="' + f.dataset.tab + '"]' : f.id ? "#" + f.id : null);
    sheet.innerHTML = '<div class="sheet-head"><h3>Design</h3><button type="button" class="done" id="sheetDone">Done</button></div>' +
      '<div class="dtabs" role="tablist" aria-label="Design">' + TABS.map(([k, l]) =>
        '<button type="button" role="tab" id="tab-' + k + '" data-tab="' + k + '" aria-selected="' + (tab === k) + '" aria-controls="tabPage" tabindex="' + (tab === k ? 0 : -1) + '">' + l + "</button>").join("") + "</div>" +
      '<div class="tab-page" id="tabPage" role="tabpanel" aria-labelledby="tab-' + tab + '">' + PAGES[tab]() + "</div>";
    if (tab === "layout") drawLayouts();
    sheet.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => {
      const set = b.dataset.set, v = b.dataset.val;
      if (set === "photoShape") { st.showPhoto = v !== "none"; if (v !== "none") st.photoShape = v; }
      else if (set === "divider") st.divider = v === "on";
      else st[set] = v;
      save(); renderAll();
    }));
    sheet.querySelectorAll("[data-ord]").forEach((b) => b.addEventListener("click", () => {
      const k = +b.dataset.ord, d = +b.dataset.dir, x = st.blocks[k];
      st.blocks[k] = st.blocks[k + d];
      st.blocks[k + d] = x;
      save(); renderAll();
    }));
    const showTab = (k) => { tab = k; buildSheet(); sheet.scrollTop = 0; sheet.querySelector('[data-tab="' + k + '"]').focus(); };
    sheet.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
    sheet.querySelector(".dtabs").addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const k = TABS.findIndex(([t]) => t === tab);
      showTab(TABS[(k + d + TABS.length) % TABS.length][0]);
    });
    // The colour picker stays open while it's dragged, so the panel isn't rebuilt under it.
    const custom = $("customColor");
    if (custom) custom.addEventListener("input", (e) => {
      st.accent = e.target.value;
      save(); renderAll(true);
      sheet.querySelectorAll(".sw").forEach((b) => b.setAttribute("aria-checked", b.dataset.val === st.accent.toLowerCase()));
      const c = contrastNote(), p = $("contrast");
      p.textContent = c.text;
      p.classList.toggle("bad", c.bad);
    });
    $("sheetDone").addEventListener("click", () => { toggleSheet(false); $("designBtn").focus(); });
    sheet.scrollTop = scrollTop;
    if (refocus) {
      const n = sheet.querySelector(refocus);
      if (n && !n.disabled) n.focus({ preventScroll: true });
    }
  }
  // The panel opens beside the signature (under it on narrower screens, with the signature
  // pinned at the top), so each change shows on the signature as it's made, and the email
  // preview shows the signature at real size while it's open.
  function toggleSheet(open) {
    sheet.hidden = !open;
    stage.classList.toggle("panel-open", open);
    $("designBtn").setAttribute("aria-expanded", open);
    if (open) { closePop(); hideBar(true); }
    scale = scaleFor();
    renderAll();
    if (open) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  }
  $("designBtn").addEventListener("click", () => toggleSheet(sheet.hidden));

  // ---------- email preview ----------
  document.querySelectorAll("[data-which]").forEach((b) => b.addEventListener("click", () => { which = b.dataset.which; renderAll(); }));

  // ---------- copying ----------
  // "Copy signature" copies the full signature. A card above the toolbar then says where to paste
  // it in Gmail and offers the shorter one for replies, which Gmail can keep as a second signature.
  const copied = $("copied");
  const TICK = '<svg class="i" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  // Screen readers hear what the card shows; the page's status line is kept for problems.
  function announce(text) {
    const a = $("announce");
    a.textContent = "";
    setTimeout(() => { a.textContent = text; }, 50);
  }
  // Copies one version and returns notes about what's in it, or null if the browser refused.
  async function doCopy(variant) {
    tidy();
    if (!(await S.copy(st, variant))) {
      closeCopied(false);
      say("Your browser blocked copying. Try Chrome, Edge or Firefox.", true);
      return null;
    }
    const notes = [];
    if (variant === "full" && localOnly()) notes.push("Your photo isn't in it: it needs a link.");
    if (S.examplesInUse(st)) notes.push("It still has example details.");
    $("copiedNote").textContent = notes.join(" ");
    $("copiedNote").hidden = !notes.length;
    return notes;
  }
  function resetShort() {
    const b = $("copyReply");
    clearTimeout(b._t);
    b.classList.remove("done");
    b.textContent = "Copy short version";
  }
  function closeCopied(focusCopy) {
    if (copied.hidden) return;
    copied.hidden = true;
    resetShort();
    if (focusCopy) $("copyFull").focus();
  }
  $("copyFull").addEventListener("click", async () => {
    const notes = await doCopy("full");
    if (!notes) return;
    resetShort();
    copied.hidden = false;
    picture($("shortPic"), S.render(st, "preview", "reply", env), 0.6);
    announce("Signature copied. " + (notes.length ? notes.join(" ") + " " : "") + "Paste it into Gmail: Settings, See all settings, Signature, Create new.");
  });
  $("copyReply").addEventListener("click", async () => {
    const notes = await doCopy("reply"), b = $("copyReply");
    if (!notes) return;
    b.classList.add("done");
    b.innerHTML = TICK + "Copied";
    clearTimeout(b._t);
    b._t = setTimeout(resetShort, 2500);
    announce("Short version copied. " + (notes.length ? notes.join(" ") + " " : "") + "Add it as a second signature in Gmail.");
  });
  $("copiedClose").addEventListener("click", () => closeCopied(true));
  document.addEventListener("mousedown", (e) => {
    if (!copied.hidden && !copied.contains(e.target) && !e.target.closest("#copyFull")) closeCopied(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !copied.hidden) closeCopied(copied.contains(document.activeElement));
  });
  $("dockFix").addEventListener("click", () => {
    const photoBtn = sig.querySelector(".photo-btn");
    if (!photoBtn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    photoBtn.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    openPhoto(photoBtn);
  });

  renderAll();
})();
