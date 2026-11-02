/* Scroll California app layer: uploads, moderation queue, reports, claims, search, near me.
   Two backends behind one interface:
   - DEMO (default): everything stays in this browser (IndexedDB + localStorage). Nothing is sent anywhere.
   - LIVE: Supabase (Auth with Google, private Storage bucket, Postgres with row-level security).
   Switch in assets/config.js > backend.mode. See DEPLOY-BACKEND.md. */
(function () {
  "use strict";
  var d = document, cfg = (window.SC_CONFIG || {}), B = cfg.backend || {};
  var LIVE = B.mode === "live" && B.supabaseUrl && B.supabaseKey;
  var CONSENT_VERSION = "2026-11-01";
  var MAX_BYTES = B.maxBytes || 50 * 1024 * 1024, MAX_S = B.maxSeconds || 60, MIN_S = B.minSeconds || 3;
  var TYPES = ["video/mp4", "video/quicktime", "video/webm"];
  var REASONS = [["not_food", "Not food / off-topic"], ["spam", "Spam or advertising"], ["copyright", "It's my video / copyright"], ["music", "Uses music without permission"],
    ["nudity", "Nudity or sexual content"], ["violence", "Violence or dangerous acts"], ["hate", "Hate or harassment"], ["minor", "Shows a child without consent"],
    ["privacy", "Shows me / private info"], ["wrong_place", "Wrong place or city"], ["other", "Something else"]];
  var REJECT = [["not_food", "Not food or not in California"], ["copyright_music", "Music or footage the uploader doesn't own"], ["quality", "Too blurry, dark or short"],
    ["wrong_place", "Can't confirm the place"], ["unsafe", "Breaks the community guidelines"], ["spam", "Spam or advertising"], ["other", "Other (see note)"]];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || d).querySelectorAll(s)); }
  function qs(k) { return new URLSearchParams(location.search).get(k) || ""; }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(16) + Math.random().toString(16).slice(2))); }
  function mimeOf(f) { if (f.type) return f.type; var e = (f.name.split(".").pop() || "").toLowerCase(); return e === "mov" ? "video/quicktime" : e === "webm" ? "video/webm" : e === "mp4" || e === "m4v" ? "video/mp4" : ""; }
  window.SCMime = mimeOf;
  function fmtMB(b) { return (b / 1048576).toFixed(1) + " MB"; }
  function when(t) { try { return new Date(t).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " PT"; } catch (e) { return t; } }
  function toast(msg) { var t = $(".toast"); if (!t) { t = d.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); d.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); setTimeout(function () { t.classList.remove("on"); }, 2200); }

  var catalogP = null;
  function catalog() { return catalogP || (catalogP = fetch("/data/catalog.json", { cache: "no-cache" }).then(function (r) { return r.json(); })); }

  /* ================= DEMO BACKEND (this browser only) ================= */
  var idb = null;
  function db() {
    return idb || (idb = new Promise(function (res, rej) {
      var r = indexedDB.open("sc-demo", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("uploads", { keyPath: "id" }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(mode, fn) { return db().then(function (x) { return new Promise(function (res, rej) { var t = x.transaction("uploads", mode), s = t.objectStore("uploads"), out = fn(s); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { rej(t.error); }; }); }); }
  function ls(k, v) { if (v === undefined) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } } localStorage.setItem(k, JSON.stringify(v)); }
  var demo = {
    kind: "demo",
    user: function () { return Promise.resolve(ls("sc_demo_user")); },
    signIn: function () { ls("sc_demo_user", { id: "demo-user", email: "demo@this-device" }); return Promise.resolve(); },
    signOut: function () { localStorage.removeItem("sc_demo_user"); return Promise.resolve(); },
    isAdmin: function () { return Promise.resolve(true); },
    upload: function (file, meta, onProg) {
      var row = Object.assign({ id: uid(), user_id: "demo-user", status: "pending", created_at: new Date().toISOString(), blob: file, mime: mimeOf(file), size_bytes: file.size }, meta);
      var p = 0;
      return new Promise(function (res) { var t = setInterval(function () { p += 20; onProg && onProg(Math.min(p, 100)); if (p >= 100) { clearInterval(t); res(); } }, 120); })
        .then(function () { return tx("readwrite", function (s) { return s.put(row); }); }).then(function () { return row; });
    },
    all: function () { return tx("readonly", function (s) { return s.getAll(); }); },
    mine: function () { return demo.all().then(function (a) { return a.sort(function (x, y) { return y.created_at < x.created_at ? -1 : 1; }); }); },
    queue: function (status) { return demo.all().then(function (a) { return a.filter(function (r) { return r.status === status; }); }); },
    videoUrl: function (r) { return Promise.resolve(URL.createObjectURL(r.blob)); },
    review: function (id, patch) {
      return tx("readonly", function (s) { return s.get(id); }).then(function (r) {
        Object.assign(r, patch, { reviewed_at: new Date().toISOString() });
        if (patch.status === "approved") { r.public_slug = (r.dish_slug + "-" + r.city_slug + "-" + r.id.slice(0, 6)).replace(/[^a-z0-9-]/g, ""); }
        return tx("readwrite", function (s) { return s.put(r); });
      });
    },
    withdraw: function (id) { return tx("readwrite", function (s) { return s.delete(id); }); },
    report: function (rep) { var a = ls("sc_demo_reports") || []; a.unshift(Object.assign({ id: a.length + 1, status: "open", created_at: new Date().toISOString() }, rep)); ls("sc_demo_reports", a); return Promise.resolve(); },
    reports: function () { return Promise.resolve((ls("sc_demo_reports") || []).filter(function (r) { return r.status === "open"; })); },
    handleReport: function (id, status) { var a = ls("sc_demo_reports") || []; a.forEach(function (r) { if (r.id === id) r.status = status; }); ls("sc_demo_reports", a); return Promise.resolve(); },
    removeVideo: function (slug) { return demo.all().then(function (a) { var r = a.filter(function (x) { return x.public_slug === slug; })[0]; return r ? demo.review(r.id, { status: "removed" }) : null; }); },
    claim: function (c) { var a = ls("sc_demo_claims") || []; a.unshift(Object.assign({ id: a.length + 1, status: "new", created_at: new Date().toISOString() }, c)); ls("sc_demo_claims", a); return Promise.resolve(); },
    claims: function () { return Promise.resolve((ls("sc_demo_claims") || []).filter(function (r) { return r.status === "new"; })); },
    handleClaim: function (id, status) { var a = ls("sc_demo_claims") || []; a.forEach(function (r) { if (r.id === id) r.status = status; }); ls("sc_demo_claims", a); return Promise.resolve(); },
    addPlace: function (p) { var a = ls("sc_demo_places") || []; a.push(p); ls("sc_demo_places", a); return Promise.resolve(p); },
    hidden: function () { return demo.queue("removed").then(function (a) { return a.map(function (r) { return r.public_slug; }); }); }
  };

  /* ================= LIVE BACKEND (Supabase) ================= */
  var sbP = null;
  function sb() {
    return sbP || (sbP = new Promise(function (res, rej) {
      function mk() { return window.supabase.createClient(B.supabaseUrl, B.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }); }
      if (window.supabase && window.supabase.createClient) return res(mk());
      var s = d.createElement("script"); s.src = "/assets/vendor/supabase-2.118.0.js";
      s.onload = function () { res(mk()); };
      s.onerror = function () { rej(new Error("Could not load the upload library.")); }; d.head.appendChild(s);
    }));
  }
  function ok(r) { if (r.error) throw r.error; return r.data; }
  var live = {
    kind: "live",
    user: function () { return sb().then(function (c) { return c.auth.getSession(); }).then(function (r) { return r.data.session ? r.data.session.user : null; }); },
    signIn: function () { return sb().then(function (c) { return c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + location.search } }); }).then(ok); },
    signOut: function () { return sb().then(function (c) { return c.auth.signOut(); }); },
    /* email sign-in: Supabase emails a magic link (and a 6-digit code if the email template includes {{ .Token }}) */
    emailCode: function (email) { return sb().then(function (c) { return c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname + location.search } }); }).then(ok); },
    verifyCode: function (email, code) { return sb().then(function (c) { return c.auth.verifyOtp({ email: email, token: code, type: "email" }); }).then(ok); },
    providers: function () { return fetch(B.supabaseUrl.replace(/\/$/, "") + "/auth/v1/settings", { headers: { apikey: B.supabaseKey } }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return j.external || {}; }).catch(function () { return {}; }); },
    isAdmin: function () { return sb().then(function (c) { return c.rpc("is_admin"); }).then(ok).then(Boolean); },
    upload: function (file, meta, onProg) {
      var client, user, mime = mimeOf(file), ext = mime === "video/quicktime" ? "mov" : mime === "video/webm" ? "webm" : "mp4";
      return sb().then(function (c) { client = c; return c.auth.getSession(); }).then(function (r) {
        var s = r.data.session; if (!s) throw new Error("Please sign in first."); user = s.user;
        var path = user.id + "/" + uid() + "." + ext;
        return new Promise(function (res, rej) {   /* XHR so we can show progress */
          var x = new XMLHttpRequest();
          x.open("POST", B.supabaseUrl.replace(/\/$/, "") + "/storage/v1/object/" + (B.uploadsBucket || "uploads") + "/" + path);
          x.setRequestHeader("Authorization", "Bearer " + s.access_token); x.setRequestHeader("apikey", B.supabaseKey);
          x.setRequestHeader("x-upsert", "false"); x.setRequestHeader("Content-Type", mime); x.setRequestHeader("cache-control", "3600");
          x.upload.onprogress = function (e) { if (e.lengthComputable && onProg) onProg(Math.round(e.loaded / e.total * 100)); };
          x.onload = function () { x.status < 300 ? res(path) : rej(new Error("Upload failed (" + x.status + "): " + (x.responseText || "").slice(0, 160))); };
          x.onerror = function () { rej(new Error("Network error during upload.")); }; x.send(file);
        });
      }).then(function (path) {
        var row = Object.assign({ storage_path: path, mime: mime, size_bytes: file.size }, meta);
        return client.from("videos").insert(row).select().single().then(ok)
          .catch(function (e) { client.storage.from(B.uploadsBucket || "uploads").remove([path]); throw e; });
      });
    },
    mine: function () { return sb().then(function (c) { return c.from("videos").select("id,status,created_at,caption,city_slug,place_slug,dish_slug,review_note,public_slug,published_at").order("created_at", { ascending: false }).limit(50); }).then(ok); },
    queue: function (status) { return sb().then(function (c) { return c.from("videos").select("*").eq("status", status).order("created_at", { ascending: status === "pending" }).limit(100); }).then(ok); },
    videoUrl: function (r) { return sb().then(function (c) { return c.storage.from(B.uploadsBucket || "uploads").createSignedUrl(r.storage_path, 3600); }).then(ok).then(function (x) { return x.signedUrl; }); },
    review: function (id, patch) { return sb().then(function (c) { return c.from("videos").update(patch).eq("id", id); }).then(ok); },
    withdraw: function (id) { return sb().then(function (c) { return c.from("videos").delete().eq("id", id); }).then(ok); },
    report: function (r) { return sb().then(function (c) { return c.rpc("submit_report", { p_slug: r.video_slug, p_reason: r.reason, p_details: r.details || null, p_email: r.contact_email || null }); }).then(ok); },
    reports: function () { return sb().then(function (c) { return c.from("reports").select("*").eq("status", "open").order("created_at").limit(100); }).then(ok); },
    handleReport: function (id, status) { return sb().then(function (c) { return c.from("reports").update({ status: status }).eq("id", id); }).then(ok); },
    removeVideo: function (slug) { return sb().then(function (c) { return c.from("videos").update({ status: "removed" }).eq("public_slug", slug); }).then(ok); },
    claim: function (x) { return sb().then(function (c) { return c.rpc("submit_claim", { p_place_slug: x.place_slug, p_name: x.name, p_email: x.email, p_phone: x.phone || null, p_role: x.role, p_message: x.message || null }); }).then(ok); },
    claims: function () { return sb().then(function (c) { return c.from("claims").select("*").eq("status", "new").order("created_at").limit(100); }).then(ok); },
    handleClaim: function (id, status) { return sb().then(function (c) { return c.from("claims").update({ status: status }).eq("id", id); }).then(ok); },
    addPlace: function (p) { return sb().then(function (c) { return c.from("places").insert(p).select().single(); }).then(ok); },
    hidden: function () { /* plain fetch: the feed doesn't need to load the Supabase library */
      return fetch(B.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/hidden_slugs", { method: "POST", headers: { apikey: B.supabaseKey, "Content-Type": "application/json" }, body: "{}" })
        .then(function (r) { if (!r.ok) throw new Error("hidden " + r.status); return r.json(); }).then(function (a) { return (a || []).map(function (x) { return x.slug || x; }); }); }
  };
  var api = LIVE ? live : demo;
  window.SCApi = api;

  /* demo banner on app pages */
  if (!LIVE && (d.getElementById("upload-app") || d.getElementById("admin-app") || d.getElementById("claim-app"))) {
    var bn = $(".demo-banner");
    if (bn) { bn.innerHTML = "<strong>Demo mode.</strong> Uploads, reports, claims and the review queue stay in <em>this browser only</em>. Nothing is sent anywhere."; bn.hidden = false; }
  }

  /* ================= REPORT DIALOG (every page) ================= */
  var dlg = $("#report-dlg");
  if (dlg) {
    dlg.innerHTML = '<form method="dialog" class="f" id="rep-form"><h2 id="rep-h">Report this video</h2>' +
      '<p class="mute small">A person reviews every report. ' + (LIVE ? "" : "<strong>Demo mode:</strong> the report stays in this browser.") + '</p>' +
      '<fieldset class="reasons"><legend>What\'s wrong?</legend>' + REASONS.map(function (r, i) { return '<label class="check"><input type="radio" name="reason" value="' + r[0] + '"' + (i ? "" : " required") + '> <span>' + r[1] + "</span></label>"; }).join("") + "</fieldset>" +
      '<label>Details (optional)<textarea name="details" maxlength="1000" rows="3"></textarea></label>' +
      '<label>Your email (optional, so we can follow up)<input name="email" type="email" maxlength="200" autocomplete="email"></label>' +
      '<p class="small mute">Copyright owner? You can also send a formal notice: see <a href="/dmca/">Copyright &amp; takedowns</a>.</p>' +
      '<div class="row"><button class="btn" type="submit" value="send">Send report</button><button class="btn ghost" type="button" data-close>Cancel</button></div><p class="f-status" role="status"></p></form>';
    var repSlug = "";
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-report]"); if (b) { e.preventDefault(); repSlug = b.dataset.report; $("#rep-form").reset(); $(".f-status", dlg).textContent = ""; dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", ""); return; }
      if (e.target.closest("[data-close]")) dlg.close();
    });
    $("#rep-form").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, st = $(".f-status", f);
      if (!f.checkValidity()) { f.reportValidity(); return; }
      st.textContent = "Sending…";
      api.report({ video_slug: repSlug, reason: f.reason.value, details: f.details.value.trim(), contact_email: f.email.value.trim() })
        .then(function () { dlg.close(); toast("Thanks. A person will review it."); window.scTrack && window.scTrack("report", repSlug); })
        .catch(function (er) { st.className = "f-status err"; st.textContent = "Couldn't send: " + (er.message || er); });
    });
  }

  /* ================= FEED: demo-approved uploads + hide removed ================= */
  var feed = $(".feed");
  if (feed) {
    api.hidden().then(function (slugs) { (slugs || []).forEach(function (s) { var c = d.getElementById("v-" + s); if (c) c.remove(); }); }).catch(function () {});
    if (!LIVE) demo.queue("approved").then(function (rows) {
      return catalog().then(function (cat) {
        rows.forEach(function (r) {
          var p = cat.places.filter(function (x) { return x.slug === r.place_slug; })[0], cty = cat.cities.filter(function (x) { return x.slug === r.city_slug; })[0], dsh = cat.dishes.filter(function (x) { return x.slug === r.dish_slug; })[0];
          var li = d.createElement("li"); li.className = "clip demo-clip"; li.id = "v-" + r.public_slug; li.dataset.slug = r.public_slug;
          li.dataset.cats = "all city-" + r.city_slug + " dish-" + r.dish_slug;
          li.innerHTML = '<div class="stage"><video muted playsinline loop preload="metadata" data-src="' + URL.createObjectURL(r.blob) + '" aria-label="' + esc(r.caption) + '"></video>' +
            '<button class="tap" aria-label="Play or pause"></button><div class="paused-ind"><span><svg viewBox="0 0 24 24" width="34" height="34" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></div><div class="shade"></div>' +
            '<div class="meta"><p class="tag">' + esc((dsh ? dsh.name : "Food") + (cty ? " · " + cty.name : "")) + ' · <span class="demo-pill">Demo: only on this device</span></p><h2>' + esc(r.caption.slice(0, 80)) + '</h2>' +
            '<div class="links">' + (p ? '<a href="' + p.url + '">' + esc(p.name) + "</a>" : "") + '</div><p class="credit">Uploaded by ' + esc(r.credit_name || "a visitor") + " · approved in the demo review queue</p></div>" +
            '<div class="rail"><button type="button" data-report="' + esc(r.public_slug) + '" aria-label="Report this video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg><span>Report</span></button></div></div>';
          window.SCFeed && window.SCFeed.add(li, true);
        });
      });
    }).catch(function () {});
  }

  /* ================= SIGN-IN BOX ================= */
  function authBox(el, after, opts) {
    opts = opts || {}; var emailForCode = "";
    api.user().then(function (u) {
      if (u) { el.innerHTML = '<p class="small mute">Signed in as <strong>' + esc(u.email || "you") + '</strong>. <button type="button" class="linkbtn" data-signout>Sign out</button></p>'; after(u); return; }
      var intro = '<div class="card signin"><h2 style="margin-top:0">Sign in to continue</h2><p class="mute">We ask uploaders to sign in so every video has an accountable owner and we can tell you when it\'s reviewed. We never post anything for you.</p>';
      if (!LIVE) { el.innerHTML = intro + '<button type="button" class="btn" data-signin>Continue as demo user</button><p class="small mute">Demo mode: no real account is created.</p></div>'; after(null); return; }
      var draw = function (pr) {
      if (opts.publicGate && !pr.google && !B.publicEmailSignIn) { el.innerHTML = ""; opts.publicGate(); after(null); return; }
      el.innerHTML = intro + '<div data-google' + (pr.google ? "" : " hidden") + '><button type="button" class="btn" data-signin>Continue with Google</button><p class="small mute or">or use your email</p></div>' +
        '<form class="f" data-email-form novalidate><label>Email<input type="email" name="email" required maxlength="200" autocomplete="email" inputmode="email"></label>' +
        '<button class="btn" type="submit">Email me a sign-in link</button></form>' +
        '<form class="f" data-code-form hidden><p class="small" data-code-msg role="status"></p><label>6-digit code (if your email shows one)<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10" required></label>' +
        '<div class="row"><button class="btn" type="submit">Sign in</button><button type="button" class="btn ghost" data-restart>Use a different email</button></div></form>' +
        '<p class="f-status" data-auth-status role="status"></p></div>';
      if (opts.publicGate && !B.publicEmailSignIn) { $("[data-email-form]", el).hidden = true; $(".or", el).hidden = true; $("#up-staff").hidden = false; }
      if (!pr.google && !B.publicEmailSignIn && !opts.publicGate) $(".signin > p.mute", el).insertAdjacentHTML("afterend", '<p class="small">Admin sign-in: we email you a sign-in link or code.</p>');
      after(null);
      };
      api.providers().then(draw);
    });
    function st(msg, cls) { var s = $("[data-auth-status]", el); if (s) { s.className = "f-status " + (cls || ""); s.textContent = msg; } }
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-signin]")) api.signIn().then(function () { if (!LIVE) location.reload(); }).catch(function (er) { toast(er.message || "Sign-in failed"); });
      if (e.target.closest("[data-signout]")) api.signOut().then(function () { location.reload(); });
      if (e.target.closest("[data-restart]")) { $("[data-code-form]", el).hidden = true; $("[data-email-form]", el).hidden = false; st(""); }
    });
    el.addEventListener("submit", function (e) {
      var f = e.target;
      if (f.matches("[data-email-form]")) {
        e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
        emailForCode = f.email.value.trim(); var b = $("button", f); b.disabled = true; st("Sending…");
        api.emailCode(emailForCode).then(function () {
          f.hidden = true; var cf = $("[data-code-form]", el); cf.hidden = false;
          $("[data-code-msg]", el).innerHTML = "Check <strong>" + esc(emailForCode) + "</strong>. Open the link in this same browser, or type the code here. Check spam if you don't see it.";
          st(""); cf.code.focus();
        }).catch(function (er) {
          var m = String(er && er.message || er);
          st(/not authorized/i.test(m) ? "Email sign-in isn't open to every address yet. Please use Continue with Google, or try again later." : /rate|seconds|too many/i.test(m) ? "Too many sign-in emails right now. Please wait a bit and try again." : "Couldn't send the email: " + m, "err");
        }).then(function () { b.disabled = false; });
      } else if (f.matches("[data-code-form]")) {
        e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
        st("Checking…");
        api.verifyCode(emailForCode, f.code.value.trim()).then(function () { location.reload(); })
          .catch(function (er) { st("That code didn't work: " + (er.message || er), "err"); });
      }
    });
  }

  /* ================= UPLOAD PAGE ================= */
  var up = $("#upload-app");
  if (up) catalog().then(function (cat) {
    var form = $("#up-form"), file = $("#up-file"), prev = $("#up-preview"), fmsg = $("#up-file-msg"), city = $("#up-city"), place = $("#up-place"), dish = $("#up-dish");
    var meta = { ok: false, duration: 0, w: 0, h: 0 };
    city.innerHTML = '<option value="">Choose a city</option>' + cat.cities.map(function (c) { return '<option value="' + c.slug + '">' + esc(c.name) + "</option>"; }).join("") + '<option value="other">Another California city…</option>';
    dish.innerHTML = '<option value="">Choose one</option>' + cat.dishes.map(function (x) { return '<option value="' + x.slug + '">' + x.emoji + " " + esc(x.name) + "</option>"; }).join("");
    function fillPlaces() {
      var c = city.value, ps = cat.places.filter(function (p) { return p.city === c; });
      place.innerHTML = '<option value="">Choose the place</option>' + ps.map(function (p) { return '<option value="' + p.slug + '">' + esc(p.name) + " (" + esc(p.street) + ")</option>"; }).join("") + '<option value="new">It\'s not listed: suggest it</option>';
      place.disabled = !c; $("#up-other-city").hidden = c !== "other"; $("#up-other-city input").required = c === "other";
      if (c === "other") { place.value = "new"; }
      togglePlace();
    }
    function togglePlace() { var n = place.value === "new"; $("#up-newplace").hidden = !n; $$("#up-newplace [data-req]").forEach(function (i) { i.required = n; }); }
    city.addEventListener("change", fillPlaces); place.addEventListener("change", togglePlace);
    var pre = qs("place") && cat.places.filter(function (p) { return p.slug === qs("place"); })[0];
    if (pre) { city.value = pre.city; fillPlaces(); place.value = pre.slug; togglePlace(); } else if (qs("city")) { city.value = qs("city"); fillPlaces(); } else fillPlaces();
    if (qs("dish")) dish.value = qs("dish");
    var cap = $("#up-caption"), cnt = $("#up-count"); cap.addEventListener("input", function () { cnt.textContent = cap.value.length + "/300"; });

    file.addEventListener("change", function () {
      meta.ok = false; fmsg.className = "small"; prev.hidden = true;
      var f = file.files[0]; if (!f) return;
      var problems = [];
      if (TYPES.indexOf(mimeOf(f)) < 0) problems.push("That file type (" + esc(f.type || f.name.split(".").pop() || "unknown") + ") isn't supported. Use MP4, MOV or WebM.");
      if (f.size > MAX_BYTES) problems.push("That file is " + fmtMB(f.size) + ". The limit is " + fmtMB(MAX_BYTES) + ". Trim it or export at 1080p or lower.");
      if (problems.length) { fmsg.className = "small err"; fmsg.innerHTML = problems.join("<br>"); return; }
      var v = $("video", prev); v.src = URL.createObjectURL(f); prev.hidden = false;
      fmsg.textContent = "Checking the video…";
      v.onloadedmetadata = function () {
        meta.duration = v.duration; meta.w = v.videoWidth; meta.h = v.videoHeight;
        var p2 = [];
        if (!isFinite(v.duration) || v.duration > MAX_S + 0.5) p2.push("Videos can be up to " + MAX_S + " seconds. This one is " + Math.round(v.duration) + "s.");
        if (v.duration < MIN_S) p2.push("Videos need to be at least " + MIN_S + " seconds.");
        if (p2.length) { fmsg.className = "small err"; fmsg.innerHTML = p2.join("<br>"); return; }
        meta.ok = true; fmsg.className = "small ok";
        fmsg.textContent = "Looks good: " + Math.round(v.duration) + "s, " + fmtMB(f.size) + (v.videoWidth > v.videoHeight ? ". Tip: vertical (9:16) videos look best in the feed." : ".");
      };
      v.onerror = function () { fmsg.className = "small err"; fmsg.textContent = "We couldn't read that video in this browser. Try exporting it as MP4 (H.264)."; };
    });

    authBox($("#up-auth"), function (u) { form.hidden = !u; $("#up-mine-wrap").hidden = !u; if (u) mine(); },
      { publicGate: LIVE ? function () { $("#up-soon").hidden = false; $("#up-staff").hidden = false; } : null });

    form.addEventListener("submit", function (e) {
      e.preventDefault(); var st = $("#up-status");
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!meta.ok) { st.className = "f-status err"; st.textContent = "Please choose a video that passes the checks above."; file.focus(); return; }
      var newPlace = place.value === "new";
      var row = {
        city_slug: city.value === "other" ? "other" : city.value,
        place_slug: newPlace ? null : place.value,
        place_suggestion: newPlace ? { name: $("#np-name").value.trim(), street: $("#np-street").value.trim(), city_name: city.value === "other" ? $("#up-other-city input").value.trim() : (city.options[city.selectedIndex] || {}).text, website: $("#np-web").value.trim() } : null,
        dish_slug: dish.value, caption: cap.value.trim(), credit_name: $("#up-credit").value.trim() || null, keep_audio: $("#up-audio").checked,
        duration_s: Math.round(meta.duration * 100) / 100, width: meta.w || null, height: meta.h || null,
        consent_rights: true, consent_music: true, consent_age18: true, consent_terms: true, consent_version: CONSENT_VERSION
      };
      var bar = $("#up-bar"), btn = $("[type=submit]", form); bar.hidden = false; btn.disabled = true; st.className = "f-status"; st.textContent = "Uploading…";
      api.upload(file.files[0], row, function (p) { bar.value = p; })
        .then(function () {
          form.reset(); prev.hidden = true; meta.ok = false; fmsg.textContent = ""; cnt.textContent = "0/300"; bar.hidden = true;
          st.className = "f-status ok"; st.innerHTML = "Uploaded. Your video is <strong>pending review</strong>. A person checks every video, usually within a day or two. It won't be public until it's approved.";
          window.scTrack && window.scTrack("upload_submitted", row.city_slug + "/" + row.dish_slug); mine(); fillPlaces();
          $("#up-mine-wrap").scrollIntoView({ behavior: "smooth" });
        })
        .catch(function (er) { bar.hidden = true; st.className = "f-status err"; st.textContent = (er && er.message) ? er.message : "Upload failed. Please try again."; })
        .then(function () { btn.disabled = false; });
    });

    function mine() {
      var box = $("#up-mine");
      api.mine().then(function (rows) {
        if (!rows.length) { box.innerHTML = '<p class="mute">No uploads yet.</p>'; return; }
        box.innerHTML = rows.map(function (r) {
          var badge = { pending: ["Pending review", "pend"], approved: [r.published_at ? "Live" : (LIVE ? "Approved: going live at the next publish" : "Approved (demo: shown in this browser's feed)"), "ok"], rejected: ["Not approved", "no"], removed: ["Removed", "no"] }[r.status] || [r.status, ""];
          return '<li class="card mine"><span class="badge ' + badge[1] + '">' + esc(badge[0]) + "</span> <strong>" + esc(r.caption.slice(0, 70)) + '</strong><br><span class="small mute">' + esc(r.dish_slug) + " · " + esc(r.place_slug || (r.place_suggestion && r.place_suggestion.name) || "") + " · " + esc(when(r.created_at)) + "</span>" +
            (r.status === "rejected" && r.review_note ? '<br><span class="small">Reason: ' + esc(r.review_note) + "</span>" : "") +
            (r.status === "approved" && r.published_at ? '<br><a href="/videos/' + esc(r.public_slug) + '/">View it</a>' : "") +
            (r.status === "pending" ? ' <button type="button" class="linkbtn" data-withdraw="' + esc(r.id) + '">Withdraw</button>' : "") + "</li>";
        }).join("");
      }).catch(function (er) { box.innerHTML = '<p class="err">' + esc(er.message || er) + "</p>"; });
    }
    $("#up-mine").addEventListener("click", function (e) { var b = e.target.closest("[data-withdraw]"); if (b && confirm("Withdraw this upload? It will be deleted.")) api.withdraw(b.dataset.withdraw).then(mine); });
  });

  /* ================= ADMIN / MODERATION QUEUE ================= */
  var adm = $("#admin-app");
  if (adm) catalog().then(function (cat) {
    var pub = $("#adm-publish"); if (pub && B.publishUrl) pub.href = B.publishUrl;
    authBox($("#adm-auth"), function (u) {
      if (!u) return;
      api.isAdmin().then(function (isA) {
        if (!isA) { $("#adm-denied").hidden = false; $("#adm-uid").textContent = u.id; return; }
        $("#adm-main").hidden = false; loadAll();
      });
    });
    function cityName(s) { var c = cat.cities.filter(function (x) { return x.slug === s; })[0]; return c ? c.name : s; }
    function placeOpts(citySlug, sel) { return '<option value="">(no place yet)</option>' + cat.places.filter(function (p) { return !citySlug || p.city === citySlug; }).map(function (p) { return '<option value="' + p.slug + '"' + (p.slug === sel ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join(""); }
    function dishOpts(sel) { return cat.dishes.map(function (x) { return '<option value="' + x.slug + '"' + (x.slug === sel ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join(""); }
    function count(id, n) { var el = $('[data-count="' + id + '"]'); if (el) el.textContent = n ? " (" + n + ")" : ""; }
    function loadAll() { loadQueue(); loadReports(); loadClaims(); loadDone(); }
    function loadQueue() {
      var box = $("#q-pending");
      api.queue("pending").then(function (rows) {
        count("pending", rows.length);
        if (!rows.length) { box.innerHTML = '<p class="mute">Nothing waiting. 🎉</p>'; return; }
        box.innerHTML = rows.map(function (r) {
          var sg = r.place_suggestion;
          return '<article class="card qitem" data-id="' + esc(r.id) + '"><div class="qgrid"><div class="qvid"><video controls playsinline muted preload="metadata" data-path="' + esc(r.id) + '"></video></div><div>' +
            '<p class="kicker">Uploaded ' + esc(when(r.created_at)) + (r.uploader_email ? " by " + esc(r.uploader_email) : "") + '</p>' +
            '<ul class="facts small"><li><b>City</b>' + esc(cityName(r.city_slug)) + (sg && sg.city_name && r.city_slug === "other" ? " → " + esc(sg.city_name) : "") + '</li>' +
            (sg ? '<li><b>Suggested place</b><span>' + esc(sg.name) + ", " + esc(sg.street) + (sg.website ? ' · <a href="' + esc(sg.website) + '" rel="noopener nofollow" target="_blank">site</a>' : "") + ' <span class="badge pend">new</span></span></li>' : "") +
            '<li><b>File</b>' + esc(r.mime) + ", " + fmtMB(r.size_bytes) + ", " + Math.round(r.duration_s) + "s" + (r.width ? ", " + r.width + "×" + r.height : "") + "</li>" +
            '<li><b>Sound</b>' + (r.keep_audio ? "Keep original sound (uploader says no unlicensed music)" : "Mute on publish") + "</li>" +
            '<li><b>Consent</b>' + (r.consent_rights && r.consent_music && r.consent_age18 && r.consent_terms ? "All 4 boxes ticked (v" + esc(r.consent_version) + ")" : "<span class=err>missing</span>") + "</li></ul>" +
            '<form class="f qform"><label>Caption<textarea name="caption" maxlength="300" rows="2">' + esc(r.caption) + "</textarea></label>" +
            '<div class="row2"><label>Place<select name="place">' + placeOpts(r.city_slug === "other" ? "" : r.city_slug, r.place_slug) + '</select></label><label>Food<select name="dish">' + dishOpts(r.dish_slug) + "</select></label></div>" +
            (sg ? '<details class="np"><summary>Create a page for "' + esc(sg.name) + '"</summary><p class="small mute">Only if you checked it\'s a real place (open its website or Google Maps). No made-up details.</p>' +
              '<label>Name<input name="np_name" value="' + esc(sg.name) + '"></label><label>Street<input name="np_street" value="' + esc(sg.street) + '"></label><div class="row2"><label>ZIP<input name="np_zip" inputmode="numeric" maxlength="5"></label><label>City<select name="np_city">' + cat.cities.map(function (c) { return '<option value="' + c.slug + '"' + (c.slug === r.city_slug ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></label></div><label>Website<input name="np_web" value="' + esc(sg.website || "") + '"></label><button type="button" class="btn ghost" data-mkplace>Create place &amp; select it</button></details>' : "") +
            '<fieldset class="checklist"><legend>Before approving, check:</legend>' + ["It's food, filmed in California", "No nudity, violence, hate or dangerous acts", "No copyrighted music (or it will be muted)", "No children shown without obvious parent consent; no private info", "The place and city are right"].map(function (t) { return '<label class="check"><input type="checkbox" required> <span>' + t + "</span></label>"; }).join("") + "</fieldset>" +
            '<div class="row"><button class="btn" data-act="approve">Approve</button><select name="reason" aria-label="Reject reason">' + REJECT.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + "</option>"; }).join("") + '</select><button type="button" class="btn ghost" data-act="reject">Reject</button></div>' +
            '<label>Note to uploader (optional)<input name="note" maxlength="300"></label><p class="f-status" role="status"></p></form></div></div></article>';
        }).join("");
        rows.forEach(function (r) { api.videoUrl(r).then(function (url) { var v = $('video[data-path="' + r.id + '"]', box); if (v) v.src = url; }); });
      }).catch(function (er) { box.innerHTML = '<p class="err">' + esc(er.message || er) + "</p>"; });
    }
    $("#q-pending").addEventListener("click", function (e) {
      var art = e.target.closest(".qitem"); if (!art) return;
      var f = $("form", art), st = $(".f-status", f), id = art.dataset.id;
      if (e.target.closest("[data-mkplace]")) {
        var name = f.np_name.value.trim(), slug = (name + "-" + f.np_city.value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!name || !f.np_street.value.trim()) { st.className = "f-status err"; st.textContent = "Name and street are required."; return; }
        api.addPlace({ slug: slug, name: name, city_slug: f.np_city.value, street: f.np_street.value.trim(), zip: f.np_zip.value.trim() || null, website: f.np_web.value.trim() || null })
          .then(function () { cat.places.push({ slug: slug, name: name, city: f.np_city.value, street: f.np_street.value.trim(), url: "/places/" + slug + "/", dishes: [] }); var o = d.createElement("option"); o.value = slug; o.textContent = name; o.selected = true; f.place.appendChild(o); st.className = "f-status ok"; st.textContent = "Place created. It gets a page at the next publish."; })
          .catch(function (er) { st.className = "f-status err"; st.textContent = er.message || er; });
        return;
      }
      var act = e.target.closest("[data-act]"); if (!act) return; e.preventDefault();
      if (act.dataset.act === "approve") {
        if (!$$(".checklist input", f).every(function (c) { return c.checked; })) { st.className = "f-status err"; st.textContent = "Tick every check first."; return; }
        if (!f.place.value) { st.className = "f-status err"; st.textContent = "Pick a place (create it from the suggestion if it's real)."; return; }
        var patch = { status: "approved", caption: f.caption.value.trim(), place_slug: f.place.value, dish_slug: f.dish.value, review_note: f.note.value.trim() || null };
        var pl = cat.places.filter(function (p) { return p.slug === f.place.value; })[0]; if (pl) patch.city_slug = pl.city;
      } else {
        var patch = { status: "rejected", review_note: (REJECT.filter(function (x) { return x[0] === f.reason.value; })[0] || ["", ""])[1] + (f.note.value.trim() ? ": " + f.note.value.trim() : "") };
      }
      st.textContent = "Saving…";
      api.review(id, patch).then(function () { art.classList.add("done"); st.className = "f-status ok"; st.textContent = patch.status === "approved" ? (LIVE ? "Approved. It goes live at the next publish run (or click Publish now)." : "Approved. Demo: it now shows at the top of the feed in this browser.") : "Rejected."; setTimeout(loadAll, 900); })
        .catch(function (er) { st.className = "f-status err"; st.textContent = er.message || er; });
    });
    function loadReports() {
      var box = $("#q-reports");
      api.reports().then(function (rows) {
        count("reports", rows.length);
        if (!rows.length) { box.innerHTML = '<p class="mute">No open reports.</p>'; return; }
        var seed = {}; cat.videos.forEach(function (v) { if (!v.ugc) seed[v.slug] = 1; });
        box.innerHTML = rows.map(function (r) {
          var reason = (REASONS.filter(function (x) { return x[0] === r.reason; })[0] || [0, r.reason])[1];
          return '<article class="card" data-rid="' + r.id + '"><p class="kicker">' + esc(when(r.created_at)) + '</p><p><strong>' + esc(reason) + '</strong> on <a href="/videos/' + esc(r.video_slug) + '/" target="_blank">' + esc(r.video_slug) + "</a>" + (seed[r.video_slug] ? ' <span class="badge">our own video</span>' : "") + "</p>" +
            (r.details ? "<p>" + esc(r.details) + "</p>" : "") + (r.contact_email ? '<p class="small">Contact: <a href="mailto:' + esc(r.contact_email) + '">' + esc(r.contact_email) + "</a></p>" : "") +
            '<div class="row"><button class="btn ghost" data-rep="dismissed">Dismiss</button>' + (seed[r.video_slug] ? '<span class="small mute">Our own clip: to pull it, remove it from _build/content.json and rebuild.</span>' : '<button class="btn" data-rep="remove">Remove video</button>') + "</div></article>";
        }).join("");
      }).catch(function (er) { box.innerHTML = '<p class="err">' + esc(er.message || er) + "</p>"; });
    }
    $("#q-reports").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rep]"); if (!b) return; var a = b.closest("[data-rid]"), id = +a.dataset.rid;
      var slug = $("a", a).textContent;
      var p = b.dataset.rep === "remove" ? (confirm("Remove this video from the site? It disappears from feeds right away and its page is deleted at the next publish.") ? api.removeVideo(slug).then(function () { return api.handleReport(id, "actioned"); }) : null) : api.handleReport(id, "dismissed");
      if (p) p.then(loadAll).catch(function (er) { toast(er.message || er); });
    });
    function loadClaims() {
      var box = $("#q-claims");
      api.claims().then(function (rows) {
        count("claims", rows.length);
        if (!rows.length) { box.innerHTML = '<p class="mute">No new claims.</p>'; return; }
        box.innerHTML = rows.map(function (r) {
          var p = cat.places.filter(function (x) { return x.slug === r.place_slug; })[0];
          return '<article class="card" data-cid="' + r.id + '"><p class="kicker">' + esc(when(r.created_at)) + '</p><p><strong>' + esc(r.name) + "</strong> (" + esc(r.role) + ") claims <a href=\"" + (p ? p.url : "#") + '" target="_blank">' + esc(p ? p.name : r.place_slug) + "</a></p>" +
            '<p class="small"><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a>" + (r.phone ? " · " + esc(r.phone) : "") + "</p>" + (r.message ? "<p>" + esc(r.message) + "</p>" : "") +
            '<p class="small mute">Verify before marking: call the business\'s public phone number, or check the email uses the business\'s own domain.</p><div class="row"><button class="btn" data-cl="verified">Mark verified</button><button class="btn ghost" data-cl="rejected">Reject</button></div></article>';
        }).join("");
      }).catch(function (er) { box.innerHTML = '<p class="err">' + esc(er.message || er) + "</p>"; });
    }
    $("#q-claims").addEventListener("click", function (e) { var b = e.target.closest("[data-cl]"); if (!b) return; api.handleClaim(+b.closest("[data-cid]").dataset.cid, b.dataset.cl).then(loadAll); });
    function loadDone() {
      var box = $("#q-done");
      Promise.all([api.queue("approved"), api.queue("rejected")]).then(function (a) {
        var rows = a[0].concat(a[1]).sort(function (x, y) { return (y.reviewed_at || "") < (x.reviewed_at || "") ? -1 : 1; }).slice(0, 30);
        box.innerHTML = rows.length ? "<ul class=\"plain\">" + rows.map(function (r) { return "<li><span class=\"badge " + (r.status === "approved" ? "ok" : "no") + "\">" + r.status + (r.status === "approved" ? (r.published_at ? ", live" : ", waiting for publish") : "") + "</span> " + esc(r.caption.slice(0, 60)) + (r.public_slug && r.status === "approved" ? ' <button type="button" class="linkbtn" data-unpub="' + esc(r.public_slug) + '">Take down</button>' : "") + "</li>"; }).join("") + "</ul>" : '<p class="mute">Nothing reviewed yet.</p>';
      });
    }
    $("#q-done").addEventListener("click", function (e) { var b = e.target.closest("[data-unpub]"); if (b && confirm("Take this video down?")) api.removeVideo(b.dataset.unpub).then(loadAll); });
    $$(".tabs [role=tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        $$(".tabs [role=tab]").forEach(function (x) { x.setAttribute("aria-selected", x === t); $("#" + x.getAttribute("aria-controls")).hidden = x !== t; });
      });
    });
  });

  /* ================= CLAIM PAGE ================= */
  var cl = $("#claim-app");
  if (cl) catalog().then(function (cat) {
    var sel = $("#cl-place");
    sel.innerHTML = '<option value="">Choose your place</option>' + cat.cities.map(function (c) {
      var ps = cat.places.filter(function (p) { return p.city === c.slug; }); if (!ps.length) return "";
      return '<optgroup label="' + esc(c.name) + '">' + ps.map(function (p) { return '<option value="' + p.slug + '">' + esc(p.name) + "</option>"; }).join("") + "</optgroup>";
    }).join("");
    if (qs("place")) sel.value = qs("place");
    $("#cl-form").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, st = $(".f-status", f);
      if ($(".hp input", f).value) return;
      if (!f.checkValidity()) { f.reportValidity(); return; }
      st.className = "f-status"; st.textContent = "Sending…";
      api.claim({ place_slug: f.place.value, name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), role: f.role.value, message: f.message.value.trim() })
        .then(function () { f.reset(); st.className = "f-status ok"; st.textContent = LIVE ? "Thanks. We'll verify and email you, usually within 2 business days." : "Saved (demo mode: only in this browser). In live mode this goes to the review queue."; window.scTrack && window.scTrack("claim_submitted", f.place.value); })
        .catch(function (er) { st.className = "f-status err"; st.textContent = "Couldn't send: " + (er.message || er); });
    });
  });

  /* ================= SEARCH + NEAR ME ================= */
  var se = $("#search-app");
  if (se) catalog().then(function (cat) {
    var inp = $("#q"), out = $("#results"), here = null;
    function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function cityOf(s) { return cat.cities.filter(function (c) { return c.slug === s; })[0] || {}; }
    function dist(a, b, c, e2) { var R = 3958.8, r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((e2 - b) * r / 2); return 2 * R * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y)); }
    function pll(p) { if (p.lat) return [p.lat, p.lng, true]; var c = cityOf(p.city); return c.lat ? [c.lat, c.lng, false] : null; }
    function run() {
      var q = norm(inp.value.trim()), toks = q.split(/\s+/).filter(Boolean);
      history.replaceState(null, "", q ? "?q=" + encodeURIComponent(inp.value.trim()) : location.pathname);
      function hit(text) { text = norm(text); return toks.every(function (t) { return text.indexOf(t) >= 0; }); }
      var dmap = {}; cat.dishes.forEach(function (x) { dmap[x.slug] = x.name; });
      var places = cat.places.filter(function (p) { return !toks.length || hit([p.name, p.street, cityOf(p.city).name, p.cuisine, p.dishes.map(function (s) { return dmap[s]; }).join(" ")].join(" ")); });
      if (here) places = places.map(function (p) { var l = pll(p); p._d = l ? dist(here[0], here[1], l[0], l[1]) : 9999; p._exact = l && l[2]; return p; }).sort(function (a, b) { return a._d - b._d; });
      var cities = cat.cities.filter(function (c) { return toks.length && hit(c.name); });
      var dishes = cat.dishes.filter(function (x) { return toks.length && hit(x.name + " " + x.slug); });
      var vids = cat.videos.filter(function (v) { return toks.length && hit([v.title, v.desc, cityOf(v.city).name, v.dishes.map(function (s) { return dmap[s]; }).join(" ")].join(" ")); });
      var h = "";
      if (cities.length || dishes.length) h += '<p class="row">' + cities.map(function (c) { return '<a class="pill" href="' + c.url + '">📍 ' + esc(c.name) + "</a>"; }).join("") + dishes.map(function (x) { return '<a class="pill" href="' + x.url + '">' + x.emoji + " " + esc(x.name) + "</a>"; }).join("") + "</p>";
      h += "<h2>" + (here ? "Places nearest you" : "Places") + ' <span class="mute small">(' + places.length + ")</span></h2>";
      h += places.length ? '<div class="cards">' + places.map(function (p) {
        return '<a class="card pcard" href="' + p.url + '">' + (p.poster ? '<img src="' + p.poster + '" alt="" width="90" height="160" loading="lazy">' : '<span class="noimg" aria-hidden="true">🍽️</span>') + '<span><span class="kicker">' + esc(cityOf(p.city).name) + (here && p._d < 9999 ? " · about " + (p._d < 10 ? p._d.toFixed(1) : Math.round(p._d)) + " mi" + (p._exact ? "" : " (city center)") : "") + "</span><br><strong>" + esc(p.name) + '</strong><br><span class="mute small">' + esc(p.street) + '</span><br><span class="pill">' + p.videos + " video" + (p.videos === 1 ? "" : "s") + "</span></span></a>";
      }).join("") + "</div>" : '<p class="mute">No places match. <a href="/upload/">Upload a video</a> and suggest the place.</p>';
      if (vids.length) h += "<h2>Videos</h2><div class=\"grid\">" + vids.map(function (v) { return '<a class="tile" href="' + v.url + '"><img src="' + v.poster + '" alt="" width="540" height="960" loading="lazy"><span>' + esc(v.title) + "</span></a>"; }).join("") + "</div>";
      out.innerHTML = h;
      $("#count").textContent = places.length + " places" + (vids.length ? ", " + vids.length + " videos" : "") + (toks.length ? ' for "' + inp.value.trim() + '"' : "");
    }
    inp.value = qs("q"); inp.addEventListener("input", run); $("#search-form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
    $("#near").addEventListener("click", function () {
      var st = $("#near-status");
      if (!navigator.geolocation) { st.textContent = "Your browser can't share location. Pick a city instead."; return; }
      st.textContent = "Asking your browser for your location (it stays on your device)…";
      navigator.geolocation.getCurrentPosition(function (p) { here = [p.coords.latitude, p.coords.longitude]; st.textContent = "Sorted by distance. Your location was used only in this page and not sent anywhere."; run(); },
        function () { st.textContent = "Location not shared. You can still search or browse by city."; }, { maximumAge: 600000, timeout: 10000 });
    });
    run();
  });
})();
