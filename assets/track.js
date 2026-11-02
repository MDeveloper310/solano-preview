/* Privacy-friendly tracking stub. No cookies, no IDs, no third-party scripts.
   Sends {type, path, ref, label, ts} to SC_CONFIG.trackEndpoint with sendBeacon.
   With no endpoint set (the default) it does nothing. Honors Do Not Track and
   Global Privacy Control. Add ?sc_debug=1 to a URL to log events to the console. */
(function () {
  var cfg = window.SC_CONFIG || {}, ep = cfg.trackEndpoint || "";
  var dbg = /[?&]sc_debug=1/.test(location.search);
  var off = navigator.doNotTrack == "1" || navigator.globalPrivacyControl === true;
  function refHost() { try { var h = new URL(document.referrer).host; return h && h !== location.host ? h : ""; } catch (e) { return ""; } }
  function send(type, label) {
    var ev = { type: type, path: location.pathname, ref: refHost(), label: label || "", ts: Date.now() };
    if (dbg) console.info("[sc-track]", ev, ep ? "" : "(no endpoint: not sent)");
    if (!ep || off) return;
    try {
      var body = JSON.stringify(ev);
      if (!(navigator.sendBeacon && navigator.sendBeacon(ep, new Blob([body], { type: "text/plain" }))))
        fetch(ep, { method: "POST", body: body, keepalive: true, mode: "no-cors" });
    } catch (e) {}
  }
  window.scTrack = send;
  send("pageview");
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    if (a.dataset.sponsor) send("sponsor_click", a.dataset.sponsor);
    else if (a.host && a.host !== location.host) send("outbound_click", a.host);
  }, true);
})();
