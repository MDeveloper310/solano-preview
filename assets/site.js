(function () {
  var cfg = window.SC_CONFIG || {}, d = document, track = function (t, l) { window.scTrack && window.scTrack(t, l); };
  /* menu */
  var mb = d.querySelector(".menu"), nav = d.getElementById("nav");
  if (mb && nav) mb.addEventListener("click", function () { var o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });
  function toast(msg) { var t = d.querySelector(".toast"); if (!t) { t = d.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); d.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); setTimeout(function () { t.classList.remove("on"); }, 1800); }
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* share */
  d.addEventListener("click", function (e) {
    var b = e.target.closest("[data-share]"); if (!b) return;
    e.preventDefault();
    var url = new URL(b.dataset.share, location.href).href, title = b.dataset.title || d.title;
    track("share", b.dataset.share);
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copied"); });
    else prompt("Copy this link", url);
  });

  /* sponsors: only active ones, matched by slot */
  var today = new Date().toISOString().slice(0, 10);
  var sponsors = (cfg.sponsors || []).filter(function (s) { return s && s.name && s.url && (!s.start || s.start <= today) && (!s.end || s.end >= today); });
  function forSlot(slot) {
    var kind = slot.split(":")[0];
    return sponsors.filter(function (s) { return (s.slots || []).some(function (x) { return x === slot || x === kind + ":*"; }); });
  }
  d.querySelectorAll(".sp-slot[data-slot]").forEach(function (el) {
    var list = forSlot(el.dataset.slot); if (!list.length) return;
    var s = list[Math.floor(Math.random() * list.length)];
    el.innerHTML = '<a href="' + esc(s.url) + '" rel="sponsored noopener" target="_blank" data-sponsor="' + esc(s.id || s.name) + '">' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" width="84" height="84" loading="lazy">' : "") +
      '<span><span class="sp-label">Sponsored</span><br><strong>' + esc(s.name) + '</strong><br><span class="mute small">' + esc(s.text) + "</span></span></a>";
    el.hidden = false; track("sponsor_impression", s.id || s.name);
  });

  /* ===== feed ===== */
  var feed = d.querySelector(".feed");
  if (feed) {
    var fs = forSlot("feed").filter(function (s) { return s.video || s.image || s.poster; }), every = cfg.feedSponsorEvery || 5;
    if (fs.length) {
      var items = [].slice.call(feed.querySelectorAll(".clip")), n = 0;
      items.forEach(function (li, i) {
        if ((i + 1) % every) return;
        var s = fs[n++ % fs.length], c = d.createElement("li");
        c.className = "clip sponsor-card"; c.dataset.cats = "all " + (li.dataset.cats || "");
        c.innerHTML = '<div class="stage">' + (s.video ? '<video muted playsinline loop preload="none" poster="' + esc(s.poster || s.image) + '" data-src="' + esc(s.video) + '"></video>' : '<img class="poster" src="' + esc(s.poster || s.image) + '" alt="">') +
          '<div class="shade"></div><div class="meta"><p class="tag">Sponsored</p><h2>' + esc(s.name) + '</h2><p class="desc">' + esc(s.text) + '</p><div class="links"><a href="' + esc(s.url) + '" rel="sponsored noopener" target="_blank" data-sponsor="' + esc(s.id || s.name) + '">Visit</a></div></div></div>';
        li.after(c); track("sponsor_impression", s.id || s.name);
      });
    }
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function load(v, light) { if (!v || !v.dataset.src) return; if (!v.src) { v.preload = light ? "metadata" : "auto"; v.src = v.dataset.src; } else if (!light) v.preload = "auto"; }
    function vids() { return [].slice.call(feed.querySelectorAll(".clip:not([hidden]) video")); }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target.querySelector("video"); if (!v) return;
        var clip = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          load(v);
          var list = vids(), i = list.indexOf(v); load(list[i + 1], true);
          if (!reduce && !clip.classList.contains("user-paused")) { var p = v.play(); if (p && p.catch) p.catch(function () { clip.classList.add("paused"); }); }
          else clip.classList.add("paused");
          if (!clip.dataset.seen) { clip.dataset.seen = 1; track("video_view", clip.dataset.slug || "sponsor"); }
        } else { v.pause(); }
      });
    }, { threshold: [0, 0.6, 1] });
    function setupClip(c) {
      io.observe(c);
      var v = c.querySelector("video");
      if (v) {
        v.addEventListener("play", function () { c.classList.remove("paused"); });
        v.addEventListener("pause", function () { c.classList.add("paused"); });
      }
    }
    feed.querySelectorAll(".clip").forEach(setupClip);
    /* app.js uses this to add demo-mode uploads to the top of the feed */
    window.SCFeed = { add: function (li, atTop) { var top = window.scrollY < 40; if (atTop) feed.insertBefore(li, feed.firstChild); else feed.appendChild(li); setupClip(li); applyFilter(); if (atTop && top) window.scrollTo(0, 0); } };
    feed.addEventListener("click", function (e) {
      var t = e.target.closest(".tap"); if (!t) return;
      var c = t.closest(".clip"), v = c.querySelector("video"); if (!v) return;
      load(v);
      if (v.paused) { c.classList.remove("user-paused"); v.play().catch(function () {}); } else { c.classList.add("user-paused"); v.pause(); }
    });
    /* filters */
    function applyFilter() {
      var cat = (location.hash.match(/^#((?:city|dish)-[a-z0-9-]+|all)$/) || [0, "all"])[1];
      if (cat !== "all" && !feed.querySelector('.clip[data-cats~="' + cat + '"]')) cat = "all";
      feed.querySelectorAll(".clip").forEach(function (c) { c.hidden = (" " + (c.dataset.cats || "") + " ").indexOf(" " + cat + " ") < 0; });
      d.querySelectorAll(".chips a").forEach(function (a) { var on = a.getAttribute("href") === "#" + cat; a.setAttribute("aria-current", on ? "true" : "false"); if (on && a.scrollIntoView && location.hash) a.scrollIntoView({ block: "nearest", inline: "center" }); });
      var first = feed.querySelector(".clip:not([hidden])"); if (first && location.hash) first.scrollIntoView();
    }
    window.addEventListener("hashchange", applyFilter); applyFilter();
    d.addEventListener("keydown", function (e) {
      if (e.target.closest("input,textarea,select,dialog")) return;
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "ArrowUp" || e.key === "k") {
        var list = [].slice.call(feed.querySelectorAll(".clip:not([hidden])")), y = innerHeight / 2, i = list.findIndex(function (c) { var r = c.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
        var nx = list[i + ((e.key === "ArrowDown" || e.key === "j") ? 1 : -1)]; if (nx) { e.preventDefault(); nx.scrollIntoView({ behavior: "smooth" }); }
      }
    });
  }

  /* ===== forms ===== */
  d.querySelectorAll("form[data-kind]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var st = f.querySelector(".f-status"), kind = f.dataset.kind;
      var ep = kind === "newsletter" ? (cfg.newsletterEndpoint || cfg.formEndpoint) : cfg.formEndpoint;
      if (f.querySelector(".hp input") && f.querySelector(".hp input").value) return; /* bot */
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var data = {}; new FormData(f).forEach(function (v, k) { if (k !== "_honey") data[k] = v; });
      data._subject = "Scroll California: " + (f.dataset.subject || kind);
      data.page = location.pathname;
      if (!ep) { st.className = "f-status err"; st.innerHTML = 'Online form isn\'t switched on yet. Please DM us on <a href="' + esc(cfg.instagram) + '">Instagram</a>.'; return; }
      st.className = "f-status"; st.textContent = "Sending…";
      var btn = f.querySelector("[type=submit]"); btn.disabled = true;
      fetch(ep, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw 0; st.className = "f-status ok"; st.textContent = f.dataset.ok || "Thanks! We got it."; f.reset(); track("form_submit", kind); })
        .catch(function () { st.className = "f-status err"; st.innerHTML = 'That didn\'t go through. Please try again, or DM us on <a href="' + esc(cfg.instagram) + '">Instagram</a>.'; })
        .then(function () { btn.disabled = false; });
    });
  });

  /* city page: filter place cards by food */
  d.querySelectorAll(".filter[role=group]").forEach(function (g) {
    g.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]"); if (!b) return;
      g.querySelectorAll("[data-filter]").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
      var f = b.dataset.filter, list = g.nextElementSibling;
      if (list) list.querySelectorAll("[data-dishes]").forEach(function (c) { c.hidden = f && (" " + c.dataset.dishes + " ").indexOf(" " + f + " ") < 0; });
    });
  });

  /* stripe link */
  d.querySelectorAll("[data-stripe]").forEach(function (a) { if (cfg.stripeLink) { a.href = cfg.stripeLink; a.hidden = false; } });

  /* retire the old site's service worker + caches */
  if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
  if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }).catch(function () {});
})();
