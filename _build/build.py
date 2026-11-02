#!/usr/bin/env python3
"""Build Scroll California v2 (static, food-only, user uploads). Run:  python3 _build/build.py
Content:  _build/content.json  (our own videos, cities, places, dish categories)
          _build/ugc.json        (approved + published visitor uploads; written by backend/publish.py)
          _build/ugc_places.json (places added by the admin from visitor suggestions; written by backend/publish.py)
          _build/ugc_cities.json (cities added by the admin; written by backend/publish.py)
Live settings (backend mode, keys, sponsors): assets/config.js (no rebuild needed)."""
import json, os, re, html, hashlib, datetime
from pathlib import Path

# ======================= SETTINGS =======================
SITE_URL = "https://scrollcalifornia.com"
ROBOTS   = "index,follow"   # "noindex,nofollow" hides the whole site (also flips robots.txt)
PUBLISHED = "2026-11-01"
STUDIO = "Crenshaw Visuals"
STUDIO_URL = "https://crenshawvisuals.com"
IG = "https://www.instagram.com/crenshawvisuals/"
MIN_INDEX_VIDEOS = 1        # category pages with fewer videos are built but noindexed and left out of the sitemap
# ========================================================

ROOT = Path(__file__).resolve().parent.parent
C = json.load(open(ROOT / "_build/content.json"))
UGC = json.load(open(ROOT / "_build/ugc.json")) if (ROOT / "_build/ugc.json").exists() else []
UGC_PLACES = json.load(open(ROOT / "_build/ugc_places.json")) if (ROOT / "_build/ugc_places.json").exists() else []
ALL_PLACES = C["places"] + [p for p in UGC_PLACES if p["slug"] not in {q["slug"] for q in C["places"]}]
PLACES = {p["slug"]: p for p in ALL_PLACES}
UGC_CITIES = json.load(open(ROOT / "_build/ugc_cities.json")) if (ROOT / "_build/ugc_cities.json").exists() else []
CITIES = {c["slug"]: c for c in C["cities"] + [c for c in UGC_CITIES if c["slug"] not in {x["slug"] for x in C["cities"]}]}
DISHES = {x["slug"]: x for x in C["dishes"]}
for v in C["videos"]: v.setdefault("media", "/media/" + v["slug"]); v["ugc"] = False
for v in UGC: v.setdefault("media", "/media/ugc/" + v["slug"]); v["ugc"] = True; v.setdefault("food", True)
ALL_VIDEOS = sorted(C["videos"], key=lambda v: 0) + sorted(UGC, key=lambda v: v.get("uploaded", ""), reverse=True)
FEED = [v for v in ALL_VIDEOS if v.get("food", True)]
INDEX = ROBOTS.startswith("index")
TODAY = datetime.date.today().isoformat()
e = lambda s: html.escape(str(s or ""), quote=True)
def ver(p): return hashlib.md5((ROOT / p).read_bytes()).hexdigest()[:8]
V = {k: ver("assets/" + k) for k in ("site.css", "site.js", "config.js", "track.js", "app.js")}
PAGES = []  # (path, priority) for sitemap

LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d47a"/><stop offset="1" stop-color="#b8862f"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><path d="M12.5 9.5v13l10-6.5z" fill="#140f05"/></svg>'
def ic(path, extra=""): return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{path}</svg>'
I_SHARE = ic('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>')
I_PIN = ic('<path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>')
I_FLAG = ic('<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>')
I_HOME = ic('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>')
I_CITY = ic('<path d="M3 21h18"/><path d="M5 21V8l6-4v17"/><path d="M11 21V10l8 3v8"/>')
I_PLUS = ic('<path d="M12 5v14M5 12h14"/>', ' stroke-width="3"')
I_SEARCH = ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')
I_FOOD = ic('<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18"/><path d="M17 3c-2 0-3 3-3 6s1 4 3 4v8"/>')
I_PLAY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'

NAV = [("/", "Feed"), ("/cities/", "Cities"), ("/food/", "Food"), ("/search/", "Search"), ("/upload/", "Upload"), ("/advertise/", "Advertise")]
TABS = [("/", "Home", I_HOME), ("/cities/", "Cities", I_CITY), ("/upload/", "Upload", I_PLUS), ("/food/", "Food", I_FOOD), ("/search/", "Search", I_SEARCH)]

def head(path, title, desc, og_img=None, jsonld=None, robots=None, extra="", og_type="website", htmlcls="", app=False):
    url = SITE_URL + path
    og_img = og_img or "/og/og-default.jpg"
    ld = "".join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>' for j in (jsonld or []))
    appjs = f'\n<script src="/assets/app.js?v={V["app.js"]}" defer></script>' if app else ""
    return f'''<!doctype html>
<html lang="en"{f' class="{htmlcls}"' if htmlcls else ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots or ROBOTS}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0b0a08">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:site_name" content="Scroll California">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}{og_img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE_URL}{og_img}">
<link rel="stylesheet" href="/assets/site.css?v={V['site.css']}">
{extra}{ld}
<script src="/assets/config.js?v={V['config.js']}" defer></script>
<script src="/assets/track.js?v={V['track.js']}" defer></script>
<script src="/assets/site.js?v={V['site.js']}" defer></script>{appjs}
</head>'''

def header(path):
    links = "".join(f'<a href="{h}"{" aria-current=page" if (h == path or (h != "/" and path.startswith(h))) else ""}>{t}</a>' for h, t in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<div class="demo-banner" hidden role="note"></div>
<header class="hdr"><a class="logo" href="/" aria-label="Scroll California home">{LOGO}<span>Scroll <b>California</b></span></a>
<button class="menu" aria-label="Menu" aria-expanded="false" aria-controls="nav">&#9776;</button>
<nav class="nav" id="nav" aria-label="Main">{links}</nav></header>'''

def tabbar(path):
    out = []
    for h, t, i in TABS:
        cur = h == path or (h != "/" and path.startswith(h))
        out.append(f'<a href="{h}"{" aria-current=page" if cur else ""}{" class=up" if h == "/upload/" else ""}>{i}<span>{t}</span></a>')
    return f'<nav class="tabbar" aria-label="Quick links">{"".join(out)}</nav>'

FOOTER = f'''<footer class="ftr"><div class="wrap">
<div><a class="logo" href="/">{LOGO}<span>Scroll <b>California</b></span></a>
<p>California food, on video, city by city. Videos come from our studio, {STUDIO}, and from visitors. Every visitor upload is reviewed by a person before it goes live. Paid placements are always labeled <strong>Sponsored</strong>.</p>
<p><a href="/newsletter/">Get new spots by email &rarr;</a></p></div>
<div><h2>Explore</h2><ul><li><a href="/">Feed</a></li><li><a href="/cities/">Cities</a></li><li><a href="/food/">Food categories</a></li><li><a href="/restaurants/">All places</a></li><li><a href="/search/">Search &amp; near me</a></li></ul></div>
<div><h2>Share &amp; business</h2><ul><li><a href="/upload/">Upload a food video</a></li><li><a href="/claim/">Claim your place</a></li><li><a href="/submit/">Suggest a spot</a></li><li><a href="/advertise/">Advertise</a></li></ul></div>
<div><h2>About</h2><ul><li><a href="/about/">About</a></li><li><a href="/guidelines/">Community guidelines</a></li><li><a href="/dmca/">Copyright &amp; takedowns</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="/privacy/#do-not-sell">Do Not Sell or Share</a></li></ul></div>
<p class="small" style="grid-column:1/-1;margin:0">&copy; 2026 Scroll California &middot; Made by <a href="{STUDIO_URL}" rel="noopener">{STUDIO}</a></p>
</div></footer>'''

def write(path, body, priority=None):
    out = ROOT / (path.lstrip("/") + ("index.html" if path.endswith("/") else ""))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body)
    if priority is not None: PAGES.append((path, priority))

def page(path, title, desc, main, priority=0.6, robots=None, bodyattr="", **kw):
    noidx = robots and robots.startswith("noindex")
    write(path, head(path, title, desc, robots=robots, **kw) + f"\n<body{bodyattr}>\n{header(path)}\n<main id=\"main\">\n{main}\n</main>\n{FOOTER}\n{tabbar(path)}\n</body></html>\n", None if noidx else priority)

def slot(name): return f'<aside class="sp-slot" data-slot="{name}" aria-label="Sponsored" hidden></aside>'
def vurl(v): return f"/videos/{v['slug']}/"
def purl(p): return f"/places/{p['slug']}/"
def curl(c): return f"/cities/{c['slug']}/"
def durl(d): return f"/food/{d['slug']}/"
def iso(sec): return f"PT{int(sec)}S"
def city_name(s): return CITIES[s]["name"] if s and s in CITIES else ""
def dish_names(v): return [DISHES[x]["name"] for x in v.get("dishes", []) if x in DISHES]
def vids_for(pred): return [v for v in ALL_VIDEOS if pred(v)]
def place_vids(p): return sorted(vids_for(lambda v: v.get("place") == p["slug"]), key=lambda v: 0 if v.get("food", True) else 1)
def poster(v): return v["media"] + ".jpg"
def credit_of(v):
    cr = v.get("creator") or {}
    return f"Uploaded by {cr.get('name') or 'a visitor'}" if v["ugc"] else f"Filmed by {STUDIO}"
def tag_of(v): return " · ".join(x for x in [(dish_names(v) or ["Food"])[0], city_name(v.get("city"))] if x)

def video_ld(v):
    p = PLACES.get(v.get("place"))
    cr = v.get("creator") or {}
    creator = {"@type": "Organization", "name": STUDIO, "url": STUDIO_URL} if not v["ugc"] else {"@type": "Person", "name": cr.get("name") or "Scroll California visitor"}
    j = {"@context": "https://schema.org", "@type": "VideoObject", "name": v["title"], "description": v["desc"],
         "thumbnailUrl": [SITE_URL + poster(v)], "uploadDate": (v.get("uploaded") or PUBLISHED) + "T09:00:00-08:00",
         "duration": iso(v["duration"]), "contentUrl": SITE_URL + v["media"] + ".mp4", "embedUrl": SITE_URL + vurl(v),
         "url": SITE_URL + vurl(v), "creator": creator, "isFamilyFriendly": True,
         "publisher": {"@type": "Organization", "name": "Scroll California", "url": SITE_URL, "logo": {"@type": "ImageObject", "url": f"{SITE_URL}/icon-512.png"}}}
    if dish_names(v): j["keywords"] = ", ".join(dish_names(v))
    if p: j["contentLocation"] = {"@type": "Place", "name": p["name"], "address": addr_ld(p)}
    return j

def addr_ld(p): return {"@type": "PostalAddress", "streetAddress": p.get("street", ""), "addressLocality": city_name(p["city"]), "addressRegion": "CA", "postalCode": p.get("zip", ""), "addressCountry": "US"}
def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u} for i, (n, u) in enumerate(items)]}
def crumbs_html(items): return '<nav aria-label="Breadcrumb"><p class="crumbs">' + " / ".join(f'<a href="{u}">{e(n)}</a>' for n, u in items[:-1]) + f' / <span aria-current="page">{e(items[-1][0])}</span></p></nav>'

def tile(v):
    return f'<a class="tile" href="{vurl(v)}"><img src="{poster(v)}" alt="" width="540" height="960" loading="lazy" decoding="async"><i>{e(tag_of(v) or "Video")}</i><span>{e(v["title"])}</span>{"<em>Visitor video</em>" if v["ugc"] else ""}</a>'

def disclosure(p):
    if not p or not p.get("client"): return ""
    return f'<p class="note"><strong>Disclosure:</strong> {STUDIO}, the studio that runs Scroll California, has filmed for {e(p["name"])} as a paid client. This page is not a paid ad. If that ever changes, we label it <strong>Sponsored</strong>.</p>'

def dish_pills(slugs, link=True):
    return " ".join((f'<a class="pill" href="{durl(DISHES[s])}">{DISHES[s]["emoji"]} {e(DISHES[s]["name"])}</a>' if link else f'<span class="pill">{e(DISHES[s]["name"])}</span>') for s in slugs if s in DISHES)

def place_dishes(p):
    out = list(p.get("dishes", []))
    for v in place_vids(p):
        for d in v.get("dishes", []):
            if d not in out: out.append(d)
    return out

# ---------------- HOME / FEED ----------------
def clip(v, i):
    p = PLACES.get(v.get("place"))
    links = (f'<a href="{purl(p)}">{e(p["name"])}</a>' if p else "") + f'<a class="alt" href="{vurl(v)}">Details</a>'
    credit = credit_of(v) + (" · paid client work" if p and p.get("client") and not v["ugc"] else "")
    pin = f'<a href="{purl(p)}" aria-label="{e(p["name"])}: address and details">{I_PIN}<span>Place</span></a>' if p else ""
    cats = " ".join(["all"] + ([f"city-{v['city']}"] if v.get("city") else []) + [f"dish-{d}" for d in v.get("dishes", [])])
    return f'''<li class="clip" id="v-{v["slug"]}" data-slug="{v["slug"]}" data-cats="{cats}">
<div class="stage">
<video muted playsinline loop preload="{"metadata" if i == 0 else "none"}" poster="{poster(v)}" data-src="{v["media"]}.mp4" aria-label="{e(v["title"])}" disableremoteplayback></video>
<button class="tap" aria-label="Play or pause: {e(v["title"])}"></button>
<div class="paused-ind"><span>{I_PLAY}</span></div>
<div class="shade"></div>
<div class="meta"><p class="tag">{e(tag_of(v))}</p><h2>{e(v["title"])}</h2><p class="desc">{e(v["desc"])}</p>
<div class="links">{links}</div><p class="credit">{e(credit)}</p></div>
<div class="rail"><button type="button" data-share="{vurl(v)}" data-title="{e(v["title"])}" aria-label="Share this video">{I_SHARE}<span>Share</span></button>{pin}<button type="button" data-report="{v["slug"]}" aria-label="Report this video">{I_FLAG}<span>Report</span></button></div>
</div></li>'''

def build_home():
    clips = "\n".join(clip(v, i) for i, v in enumerate(FEED))
    cities = [c for c in CITIES.values() if any(v.get("city") == c["slug"] for v in FEED)]
    dishes = [d for d in C["dishes"] if any(d["slug"] in v.get("dishes", []) for v in FEED)]
    chips = '<a href="#all" aria-current="true">All</a>' + "".join(f'<a href="#city-{c["slug"]}">{e(c["name"])}</a>' for c in cities) + "".join(f'<a href="#dish-{d["slug"]}">{d["emoji"]} {e(d["name"])}</a>' for d in dishes)
    city_pills = " ".join(f'<a class="pill" href="{curl(c)}">{e(c["name"])}</a>' for c in CITIES.values())
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": "Scroll California", "url": SITE_URL + "/", "description": "California food on video, city by city.",
           "potentialAction": {"@type": "SearchAction", "target": SITE_URL + "/search/?q={search_term_string}", "query-input": "required name=search_term_string"}},
          {"@context": "https://schema.org", "@type": "Organization", "name": "Scroll California", "url": SITE_URL + "/", "logo": f"{SITE_URL}/icon-512.png",
           "sameAs": [IG, STUDIO_URL], "parentOrganization": {"@type": "Organization", "name": STUDIO, "url": STUDIO_URL}},
          {"@context": "https://schema.org", "@type": "ItemList", "name": "Latest food videos", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + vurl(v)} for i, v in enumerate(FEED)]}]
    extra = f'<link rel="preload" as="image" href="{poster(FEED[0])}" fetchpriority="high">\n'
    body = head("/", "Scroll California: California food on video, city by city", "Swipe short food videos from California restaurants, city by city: tacos, steak, desserts, drinks and more. Upload your own food videos too.", jsonld=ld, extra=extra, htmlcls="feedhtml", app=True)
    body += f'''
<body class="feedpage">
{header("/")}
<main id="main">
<h1 class="sr">Scroll California: California food on video, city by city</h1>
<nav class="chips" aria-label="Filter videos">{chips}</nav>
<ol class="feed" aria-label="Food video feed">
{clips}
</ol>
<section class="endcard" aria-labelledby="more">
<div class="wrap narrow">
<p class="kicker">You reached the end (for now)</p>
<h2 id="more" style="margin-top:.2em">Got a food video? Add it.</h2>
<p class="lead">Scroll California is new and growing one real video at a time. Filmed a great plate in California? Upload it. A person reviews every video before it goes live.</p>
<div class="row" style="margin:14px 0 22px"><a class="btn" href="/upload/">Upload a food video</a><a class="btn ghost" href="/search/">Search or find food near me</a></div>
<h3>Browse by city</h3><p class="row">{city_pills}</p>
<h3>Browse by food</h3><p class="row">{dish_pills([d["slug"] for d in C["dishes"]])}</p>
<h3>Get new spots by email</h3>
{news_form("home")}
<h3>Run a restaurant?</h3>
<p class="mute">Claim your place's page for free, or ask about a sponsored feature. Every paid placement is labeled.</p>
<div class="row"><a class="btn ghost" href="/claim/">Claim your place</a><a class="btn ghost" href="/advertise/">Advertise</a></div>
{slot("home")}
</div>
{FOOTER}
</section>
</main>
{tabbar("/")}
<dialog class="report-dlg" id="report-dlg" aria-labelledby="rep-h"></dialog>
</body></html>
'''
    write("/", body, 1.0)

def news_form(where):
    return f'''<form class="f inline-news" data-kind="newsletter" data-subject="Newsletter signup ({where})" data-ok="You're on the list. Watch your inbox." novalidate>
<label class="sr" for="nl-{where}">Email address</label>
<input id="nl-{where}" name="email" type="email" required autocomplete="email" placeholder="you@email.com">
<span class="hp" aria-hidden="true"><input name="_honey" tabindex="-1" autocomplete="off"></span>
<button class="btn" type="submit">Sign up</button>
<p class="f-status small" role="status" style="flex-basis:100%;margin:0"></p>
</form>'''

REPORT_DLG = '<dialog class="report-dlg" id="report-dlg" aria-labelledby="rep-h"></dialog>'

# ---------------- VIDEO PAGES ----------------
def build_videos():
    for v in ALL_VIDEOS:
        p = PLACES.get(v.get("place"))
        items = [("Home", "/")] + ([(city_name(v["city"]), curl(CITIES[v["city"]]))] if v.get("city") in CITIES else [("Food", "/food/")]) + ([(p["name"], purl(p))] if p else []) + [(v["title"], vurl(v))]
        facts = ""
        if p: facts += f'<li><b>Place</b><a href="{purl(p)}">{e(p["name"])}</a></li><li><b>Address</b>{e(p.get("street"))}, {e(city_name(p["city"]))}, CA {e(p.get("zip"))}</li>'
        if dish_names(v): facts += f'<li><b>Food</b><span>{dish_pills(v["dishes"])}</span></li>'
        cr = v.get("creator") or {}
        facts += f'<li><b>Length</b>{v["duration"]} seconds</li>'
        facts += (f'<li><b>Uploaded by</b>{e(cr.get("name") or "A visitor")}</li><li><b>Reviewed</b>Checked by a person before publishing</li>' if v["ugc"] else f'<li><b>Filmed by</b><a href="{STUDIO_URL}" rel="noopener">{STUDIO}</a></li>')
        others = "".join(tile(o) for o in FEED if o["slug"] != v["slug"])
        venue_note = "" if p else '<p class="note">We\'re confirming the venue for this clip. If it\'s yours, <a href="/claim/">tell us</a>.</p>'
        main = f'''<div class="wrap"><div class="split">
<div class="player"><video controls playsinline muted preload="metadata" poster="{poster(v)}" width="720" height="1280"><source src="{v["media"]}.mp4" type="video/mp4"></video></div>
<div>{crumbs_html(items)}
<p class="kicker">{e(tag_of(v) or "Video")}</p>
<h1>{e(v["title"])}</h1>
<p class="lead">{e(v["desc"])}</p>
<ul class="facts">{facts}</ul>
<div class="row" style="margin:18px 0"><button class="btn" type="button" data-share="{vurl(v)}" data-title="{e(v["title"])}">Share</button>{f'<a class="btn ghost" href="{purl(p)}">See the place</a>' if p else ""}{f'<a class="btn ghost" href="/#v-{v["slug"]}">Watch in the feed</a>' if v.get("food", True) else ""}<button class="btn ghost" type="button" data-report="{v["slug"]}">Report</button></div>
{disclosure(p) if not v["ugc"] else ""}{venue_note}
{slot("video:" + v["slug"])}
</div></div>
<h2>More food videos</h2><div class="grid">{others}</div></div>
{REPORT_DLG}'''
        page(vurl(v), f"{v['title']} | Scroll California", v["desc"][:155], main, 0.7, app=True,
             og_img=f"/og/{v['slug']}.jpg", og_type="video.other", jsonld=[video_ld(v), crumbs_ld(items)])

# ---------------- PLACE PAGES (Yelp-style) ----------------
def build_places():
    for p in ALL_PLACES:
        c = CITIES[p["city"]]; vids = place_vids(p)
        items = [("Home", "/"), ("Cities", "/cities/"), (c["name"], curl(c)), (p["name"], purl(p))]
        maps = "https://www.google.com/maps/search/?api=1&query=" + re.sub(r"\s+", "+", f'{p["name"]} {p.get("street","")} {c["name"]} CA {p.get("zip","")}')
        why = "".join(f"<p>{e(x)}</p>" for x in p.get("why", []))
        good = " ".join(f'<span class="pill">{e(g)}</span>' for g in p.get("good_for", []))
        ds = place_dishes(p)
        stype = p.get("type", "Restaurant")
        ld = {"@context": "https://schema.org", "@type": stype, "name": p["name"], "address": addr_ld(p), "description": p.get("short", ""),
              "mainEntityOfPage": SITE_URL + purl(p)}
        if p.get("website"): ld["url"] = p["website"]
        if vids: ld["image"] = [SITE_URL + poster(v) for v in vids]; ld["subjectOf"] = [video_ld(v) for v in vids]
        if p.get("cuisine"): ld["servesCuisine"] = p["cuisine"]
        if p.get("lat"): ld["geo"] = {"@type": "GeoCoordinates", "latitude": p["lat"], "longitude": p["lng"]}
        kind = {"Restaurant": "Restaurant", "Hotel": "Hotel dining"}.get(stype, "Food spot")
        host = re.sub(r"^https?://(www\.)?", "", p.get("website", "")).split("/")[0]
        v0 = vids[0] if vids else None
        player = f'<div class="player"><video controls playsinline muted preload="metadata" poster="{poster(v0)}" width="720" height="1280"><source src="{v0["media"]}.mp4" type="video/mp4"></video></div>' if v0 else '<div class="player empty"><p>No videos yet.<br><a href="/upload/?place=' + p["slug"] + '">Be the first to upload one</a></p></div>'
        n_ugc = sum(1 for v in vids if v["ugc"]); n_own = len(vids) - n_ugc
        counts = f'{len(vids)} video{"s" if len(vids) != 1 else ""}' + (f' ({n_own} from our studio, {n_ugc} from visitors)' if n_ugc else "")
        main = f'''<div class="wrap"><div class="split">
{player}
<div>{crumbs_html(items)}
<p class="kicker">{kind} · {e(c["name"])}, CA</p>
<h1>{e(p["name"])}</h1>
<p class="lead">{e(p.get("short",""))}</p>
<p class="row">{dish_pills(ds)}</p>
<ul class="facts biz"><li><b>Address</b><span>{e(p.get("street",""))}, {e(c["name"])}, CA {e(p.get("zip",""))}</span></li>
<li><b>City</b><a href="{curl(c)}">{e(c["name"])}</a></li>
<li><b>Category</b><span>{e(p.get("cuisine") or kind)}</span></li>
<li><b>Map</b><a href="{e(maps)}" rel="noopener">Directions in Google Maps</a></li>
{f'<li><b>Website</b><a href="{e(p["website"])}" rel="noopener">{e(host)}</a></li>' if p.get("website") else ""}
<li><b>Videos</b><span>{counts}</span></li></ul>
<p class="small mute">No star ratings here, just video. Hours, menus and prices change, so check the official website before you go.</p>
<div class="row" style="margin:18px 0"><a class="btn" href="/upload/?place={p["slug"]}">Upload a video of this place</a><button class="btn ghost" type="button" data-share="{purl(p)}" data-title="{e(p["name"])}">Share</button></div>
{f"<h2>Why go</h2>{why}" if why else ""}
{f'<p class="row">{good}</p>' if good else ""}
{disclosure(p)}
{slot("place:" + p["slug"])}
</div></div>
<h2>Videos of {e(p["name"])}</h2><div class="grid">{"".join(tile(v) for v in vids) or '<p class="mute">No videos yet.</p>'}</div>
<div class="card claim" style="margin-top:28px"><h3>Own or manage {e(p["name"])}?</h3><p class="mute">Claim this page for free to fix details, get notified about new videos of your place, and ask for anything to be corrected. Claiming doesn't change what visitors post, and it isn't an ad.</p><a class="btn ghost" href="/claim/?place={p["slug"]}">Claim this place</a></div>
</div>
{REPORT_DLG}'''
        title = f"{p['name']}, {c['name']} CA: food videos & address"
        page(purl(p), title if len(title) <= 65 else f"{p['name']} ({c['name']}, CA) food videos", f"{p.get('short','')} Watch food videos and get the address for {p['name']} in {c['name']}, California."[:158], main, 0.8, app=True,
             og_img=f"/og/{v0['slug']}.jpg" if v0 else None, jsonld=[ld, crumbs_ld(items)])

# ---------------- CITIES / FOOD CATEGORIES ----------------
def place_card(p):
    c = CITIES[p["city"]]; vs = place_vids(p); v = vs[0] if vs else None
    img = f'<img src="{poster(v)}" alt="" width="90" height="160" loading="lazy">' if v else '<span class="noimg" aria-hidden="true">🍽️</span>'
    ds = ", ".join(DISHES[d]["name"] for d in place_dishes(p)[:3] if d in DISHES)
    return f'''<a class="card pcard" href="{purl(p)}" data-dishes="{" ".join(place_dishes(p))}">{img}
<span><span class="kicker">{e(c["name"])}{" · " + e(ds) if ds else ""}</span><br><strong>{e(p["name"])}</strong><br><span class="mute small">{e(p.get("street",""))}, {e(c["name"])}</span><br><span class="mute">{e(p.get("short",""))}</span><br><span class="pill">{len(vs)} video{"s" if len(vs) != 1 else ""}</span></span></a>'''

def build_cities():
    for c in CITIES.values():
        ps = [p for p in ALL_PLACES if p["city"] == c["slug"]]
        ps.sort(key=lambda p: -len(place_vids(p)))
        vids = [v for v in FEED if v.get("city") == c["slug"]]
        ds = []
        for p in ps:
            for d in place_dishes(p):
                if d not in ds: ds.append(d)
        items = [("Home", "/"), ("Cities", "/cities/"), (c["name"], curl(c))]
        ld = [crumbs_ld(items), {"@context": "https://schema.org", "@type": "CollectionPage", "name": f"{c['name']}, CA food on video", "url": SITE_URL + curl(c),
              "about": {"@type": "City", "name": c["name"], "containedInPlace": {"@type": "State", "name": "California"}},
              "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + purl(p), "name": p["name"]} for i, p in enumerate(ps)]}}]
        filt = ('<div class="row filter" role="group" aria-label="Filter places by food"><button type="button" class="pill on" data-filter="">All</button>' + "".join(f'<button type="button" class="pill" data-filter="{d}">{DISHES[d]["emoji"]} {e(DISHES[d]["name"])}</button>' for d in ds if d in DISHES) + "</div>") if ds else ""
        main = f'''<div class="wrap">{crumbs_html(items)}
<p class="kicker">City guide · California</p>
<h1>{e(c["name"])} food, on video</h1>
<p class="lead">{e(c.get("intro") or ("Food videos from " + c["name"] + ", California."))}</p>
<div class="row" style="margin:6px 0 10px"><a class="btn" href="/#city-{c["slug"]}">Swipe {e(c["name"])} videos</a><a class="btn ghost" href="/upload/?city={c["slug"]}">Upload a {e(c["name"])} food video</a></div>
<h2>Places in {e(c["name"])}</h2>
{filt}
<div class="cards places">{"".join(place_card(p) for p in ps)}</div>
{slot("city:" + c["slug"])}
<h2>Videos from {e(c["name"])}</h2><div class="grid">{"".join(tile(v) for v in vids)}</div>
<div class="card" style="margin-top:28px"><h3>Know a great spot in {e(c["name"])}?</h3><p class="mute">Upload a video of it and suggest the place. We check every new place before it gets a page. <a href="/upload/?city={c["slug"]}">Upload</a> or <a href="/newsletter/">get new {e(c["name"])} spots by email</a>.</p></div>
</div>'''
        page(curl(c), f"{c['name']}, CA food videos & places | Scroll California", f"{c['intro']}"[:158], main, 0.8,
             og_img=f"/og/{vids[0]['slug']}.jpg" if vids else None, jsonld=ld)
    items = [("Home", "/"), ("Cities", "/cities/")]
    cards = "".join(f'<a class="card" href="{curl(c)}" data-lat="{c.get("lat","")}" data-lng="{c.get("lng","")}" style="text-decoration:none;color:inherit"><h3>{e(c["name"])}</h3><p class="mute">{e(c.get("intro") or ("Food videos from " + c["name"] + ", California."))}</p><span class="pill">{len([p for p in ALL_PLACES if p["city"] == c["slug"]])} place(s) · {len([v for v in FEED if v.get("city") == c["slug"]])} video(s)</span></a>' for c in CITIES.values())
    page("/cities/", "California cities: food on video | Scroll California", "Browse California food videos by city: Vacaville, Fairfield, San Francisco and more cities as visitors and our studio add them.", f'''<div class="wrap">{crumbs_html(items)}<h1>Cities</h1><p class="lead">Food videos, city by city. More cities open as people upload.</p><div class="cards">{cards}</div></div>''', 0.6, jsonld=[crumbs_ld(items)])

def build_food():
    for d in C["dishes"]:
        vids = [v for v in FEED if d["slug"] in v.get("dishes", [])]
        ps = [p for p in ALL_PLACES if d["slug"] in place_dishes(p)]
        items = [("Home", "/"), ("Food", "/food/"), (d["name"], durl(d))]
        thin = len(vids) < MIN_INDEX_VIDEOS
        ld = [crumbs_ld(items), {"@context": "https://schema.org", "@type": "CollectionPage", "name": f"{d['name']} in California, on video", "url": SITE_URL + durl(d),
              "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + vurl(v), "name": v["title"]} for i, v in enumerate(vids)]}}]
        cities = sorted({p["city"] for p in ps})
        body = f'''<div class="wrap">{crumbs_html(items)}<p class="kicker">Food · California</p><h1>{d["emoji"]} {e(d["name"])} in California, on video</h1>
<p class="lead">{f"Real {e(d['name'].lower())} videos from California places{', in ' + ', '.join(e(city_name(x)) for x in cities) if cities else ''}. Tap a place for the address." if vids else f"No {e(d['name'].lower())} videos yet. Filmed some? You could be first."}</p>
<div class="row" style="margin:6px 0 18px">{f'<a class="btn" href="/#dish-{d["slug"]}">Swipe the {e(d["name"].lower())} feed</a>' if vids else ""}<a class="btn ghost" href="/upload/?dish={d["slug"]}">Upload a {e(d["name"].lower())} video</a></div>
{f'<h2>Videos</h2><div class="grid">{"".join(tile(v) for v in vids)}</div>' if vids else ""}
{f'<h2>Places</h2><div class="cards">{"".join(place_card(p) for p in ps)}</div>' if ps else ""}
{slot("category:" + d["slug"])}
</div>'''
        page(durl(d), f"{d['name']} in California on video | Scroll California", f"Watch {d['name'].lower()} videos from real California restaurants, with addresses, city by city."[:158], body, 0.7,
             robots="noindex,follow" if (thin or not INDEX) else None, og_img=f"/og/{vids[0]['slug']}.jpg" if vids else None, jsonld=ld)
    items = [("Home", "/"), ("Food", "/food/")]
    cards = "".join(f'<a class="card fcard" href="{durl(d)}"><span class="emo" aria-hidden="true">{d["emoji"]}</span><strong>{e(d["name"])}</strong><span class="mute small">{len([v for v in FEED if d["slug"] in v.get("dishes", [])])} video(s)</span></a>' for d in C["dishes"])
    page("/food/", "Food categories: tacos, pizza, brunch & more | Scroll California", "Browse California food videos by category: tacos, pizza, burgers, brunch, steak, desserts, drinks and more.", f'<div class="wrap">{crumbs_html(items)}<h1>Food</h1><p class="lead">Pick a craving.</p><div class="cards fcards">{cards}</div></div>', 0.7, jsonld=[crumbs_ld(items)])
    # all places (old /restaurants/ URL)
    items = [("Home", "/"), ("All places", "/restaurants/")]
    ps = sorted(ALL_PLACES, key=lambda p: (city_name(p["city"]), p["name"]))
    page("/restaurants/", "California restaurants & food spots on video | Scroll California", "Every California restaurant and food spot on Scroll California, with addresses and real videos.", f'<div class="wrap">{crumbs_html(items)}<h1>All places</h1><p class="lead">Every place with a page on Scroll California. We only list real places that we or our visitors have filmed.</p><div class="cards">{"".join(place_card(p) for p in ps)}</div>{slot("category:restaurants")}</div>', 0.8, jsonld=[crumbs_ld(items)])

# ---------------- APP PAGES ----------------
def build_app_pages():
    S = ROOT / "_build/pages/app"
    for f in sorted(S.glob("*.html")):
        raw = f.read_text(); m = re.match(r"<!--\s*(\{.*?\})\s*-->\n", raw, re.S)
        meta = json.loads(m.group(1)); body = raw[m.end():] + "\n" + REPORT_DLG
        page(meta["path"], meta["title"], meta["desc"], body, meta.get("priority", 0.5), robots=meta.get("robots"), app=True, jsonld=meta.get("jsonld"), bodyattr=' data-app="1"')

def build_catalog():
    (ROOT / "data").mkdir(exist_ok=True)
    cat = {"generated": TODAY,
           "cities": [{"slug": c["slug"], "name": c["name"], "lat": c.get("lat"), "lng": c.get("lng"), "url": curl(c)} for c in CITIES.values()],
           "dishes": [{"slug": d["slug"], "name": d["name"], "emoji": d["emoji"], "url": durl(d)} for d in C["dishes"]],
           "places": [{"slug": p["slug"], "name": p["name"], "city": p["city"], "street": p.get("street", ""), "zip": p.get("zip", ""), "lat": p.get("lat"), "lng": p.get("lng"),
                       "dishes": place_dishes(p), "cuisine": p.get("cuisine", ""), "url": purl(p), "videos": len(place_vids(p)), "poster": poster(place_vids(p)[0]) if place_vids(p) else ""} for p in ALL_PLACES],
           "videos": [{"slug": v["slug"], "title": v["title"], "desc": v["desc"], "city": v.get("city"), "place": v.get("place"), "dishes": v.get("dishes", []), "url": vurl(v), "poster": poster(v), "ugc": v["ugc"]} for v in FEED]}
    (ROOT / "data/catalog.json").write_text(json.dumps(cat, ensure_ascii=False, separators=(",", ":")))

# ---------------- STATIC TEXT PAGES ----------------
def build_static():
    S = Path(ROOT / "_build/pages")
    for f in sorted(S.glob("*.html")):
        raw = f.read_text()
        m = re.match(r"<!--\s*(\{.*?\})\s*-->\n", raw, re.S)
        meta = json.loads(m.group(1)); body = raw[m.end():]
        body = body.replace("{{NEWS_FORM}}", news_form(meta["path"].strip("/") or "page")).replace("{{IG}}", IG).replace("{{STUDIO_URL}}", STUDIO_URL)
        page(meta["path"], meta["title"], meta["desc"], body, meta.get("priority", 0.5), jsonld=meta.get("jsonld"))

REDIRECTS = {"/media-kit/": "/advertise/#media-kit", "/get-featured/": "/advertise/", "/apply/": "/submit/",
             "/contact/": "/submit/", "/watch/": "/", "/disclosures/": "/terms/", "/privacy/do-not-sell/": "/privacy/#do-not-sell",
             "/cookies/": "/privacy/", "/checkout/": "/advertise/", "/hire-a-creator/": "/advertise/", "/solano-north-bay/": "/cities/",
             "/bay-area/": "/cities/", "/los-angeles/": "/cities/", "/category/": "/food/", "/best/": "/food/", "/hotels/": "/food/hotel-dining/"}
def build_redirects():
    for src, dst in REDIRECTS.items():
        write(src, f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="{SITE_URL}{dst.split("#")[0]}"><meta http-equiv="refresh" content="0;url={dst}"></head><body><p>This page moved to <a href="{dst}">{SITE_URL}{dst}</a>.</p></body></html>\n')

def build_404():
    body = head("/404.html", "Page not found | Scroll California", "That page isn't here.", robots="noindex,follow") + f'''
<body>{header("/404")}<main id="main"><div class="wrap narrow"><p class="kicker">404</p><h1>That page isn't here.</h1>
<p class="lead">If you followed a link to a video, it may have been removed after a report, or it's still waiting for review. Start with the feed, or browse by city.</p>
<div class="row"><a class="btn" href="/">Watch the feed</a><a class="btn ghost" href="/cities/">Cities</a><a class="btn ghost" href="/food/">Food</a></div></div></main>{FOOTER}{tabbar("/404")}</body></html>'''
    (ROOT / "404.html").write_text(body)

def build_seo_files():
    (ROOT / "robots.txt").write_text(("User-agent: *\nAllow: /\nDisallow: /_build/\nDisallow: /admin/\nDisallow: /backend/\n\n" if INDEX else "User-agent: *\nDisallow: /\n\n") + f"Sitemap: {SITE_URL}/sitemap.xml\n")
    vids = {vurl(v): v for v in ALL_VIDEOS}
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    for path, pr in PAGES:
        v = vids.get(path)
        lm = (v.get("uploaded") if v else None) or PUBLISHED
        out.append(f"  <url>\n    <loc>{SITE_URL}{path}</loc>\n    <lastmod>{lm}</lastmod>\n    <priority>{pr:.1f}</priority>")
        if v:
            out.append(f"    <video:video>\n      <video:thumbnail_loc>{SITE_URL}{poster(v)}</video:thumbnail_loc>\n      <video:title>{e(v['title'])}</video:title>\n      <video:description>{e(v['desc'])}</video:description>\n      <video:content_loc>{SITE_URL}{v['media']}.mp4</video:content_loc>\n      <video:duration>{v['duration']}</video:duration>\n      <video:publication_date>{lm}T09:00:00-08:00</video:publication_date>\n      <video:family_friendly>yes</video:family_friendly>\n    </video:video>")
        out.append("  </url>")
    out.append("</urlset>\n")
    (ROOT / "sitemap.xml").write_text("\n".join(out))

def build_og():
    try: from PIL import Image, ImageDraw, ImageFont, ImageFilter
    except ImportError: print("PIL missing: skipping OG images"); return
    (ROOT / "og").mkdir(exist_ok=True)
    fp = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    def font(sz):
        try: return ImageFont.truetype(fp, sz)
        except Exception: return ImageFont.load_default()
    def wrap(d, text, f, w):
        lines, cur = [], ""
        for word in text.split():
            t = (cur + " " + word).strip()
            if d.textlength(t, font=f) <= w: cur = t
            else: lines.append(cur); cur = word
        lines.append(cur); return lines
    def make(name, posters, title, sub):
        out = ROOT / "og" / name
        if out.exists() and name != "og-default.jpg" and out.stat().st_mtime > max((ROOT / p.lstrip("/")).stat().st_mtime for p in posters): return
        im = Image.new("RGB", (1200, 630), (11, 10, 8))
        bg = Image.open(ROOT / posters[0].lstrip("/")).convert("RGB").resize((1200, 2133)).crop((0, 750, 1200, 1380)).filter(ImageFilter.GaussianBlur(28))
        im.paste(Image.blend(bg, Image.new("RGB", bg.size, (11, 10, 8)), 0.62))
        x = 1200 - 40
        for p in reversed(posters[:3]):
            t = Image.open(ROOT / p.lstrip("/")).convert("RGB").resize((300, 533)); x -= 300
            im.paste(t, (x, 48)); x -= 16
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((60, 60, 112, 112), 14, fill=(217, 168, 69)); d.polygon([(80, 74), (80, 98), (100, 86)], fill=(20, 15, 5))
        d.text((128, 70), "Scroll California", font=font(30), fill=(244, 239, 230))
        tw = x - 60 - 20; y = 190
        for ln in wrap(d, title, font(50), tw)[:4]:
            d.text((60, y), ln, font=font(50), fill=(255, 255, 255)); y += 62
        d.text((60, y + 14), sub, font=font(26), fill=(240, 199, 102))
        im.save(out, quality=82, optimize=True, progressive=True)
    make("og-default.jpg", [poster(v) for v in FEED[:3]], "California food, on video, city by city", "Watch. Upload. Find the place.")
    for v in ALL_VIDEOS:
        make(f"{v['slug']}.jpg", [poster(v)], v["title"], (city_name(v.get("city")) + ", CA") if v.get("city") else "California")

if __name__ == "__main__":
    build_og(); build_home(); build_food(); build_cities(); build_places(); build_videos(); build_app_pages(); build_static(); build_redirects(); build_404(); build_catalog(); build_seo_files()
    print(f"Built {len(PAGES)} indexable pages, {len(REDIRECTS)} redirects, {len(ALL_VIDEOS)} videos ({len(UGC)} visitor), {len(ALL_PLACES)} places. robots={ROBOTS}")
