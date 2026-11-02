#!/usr/bin/env python3
"""Build Scroll California (static). Run from anywhere:  python3 _build/build.py
Edits: content in _build/content.json, settings below, live config in assets/config.js."""
import json, os, re, html, hashlib, shutil, datetime
from pathlib import Path

# ======================= SETTINGS =======================
SITE_URL = "https://scrollcalifornia.com"   # change if the domain changes
ROBOTS   = "index,follow"   # THE robots switch. "index,follow" = open to Google (launch).
                            # "noindex,nofollow" = hide everything (also flips robots.txt).
PUBLISHED = "2026-11-01"
STUDIO = "Crenshaw Visuals"
STUDIO_URL = "https://crenshawvisuals.com"
IG = "https://www.instagram.com/crenshawvisuals/"
# ========================================================

ROOT = Path(__file__).resolve().parent.parent
C = json.load(open(ROOT / "_build/content.json"))
PLACES = {p["slug"]: p for p in C["places"]}
CITIES = {c["slug"]: c for c in C["cities"]}
VIDEOS = C["videos"]
INDEX = ROBOTS.startswith("index")
TODAY = PUBLISHED
e = lambda s: html.escape(str(s or ""), quote=True)
def ver(p): return hashlib.md5((ROOT / p).read_bytes()).hexdigest()[:8]
V = {k: ver("assets/" + k) for k in ("site.css", "site.js", "config.js", "track.js")}
PAGES = []  # (path, priority) for sitemap

LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d47a"/><stop offset="1" stop-color="#b8862f"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><path d="M12.5 9.5v13l10-6.5z" fill="#140f05"/></svg>'
I_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>'
I_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>'
I_PLAY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'

NAV = [("/", "Watch"), ("/restaurants/", "Restaurants"), ("/hotels/", "Hotels"), ("/cities/", "Cities"), ("/submit/", "Submit a spot"), ("/advertise/", "Advertise")]

def head(path, title, desc, og_img=None, jsonld=None, robots=None, extra="", og_type="website", htmlcls=""):
    url = SITE_URL + path
    og_img = og_img or "/og/og-default.jpg"
    ld = "".join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>' for j in (jsonld or []))
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
<script src="/assets/site.js?v={V['site.js']}" defer></script>
</head>'''

def header(path):
    links = "".join(f'<a href="{h}"{" aria-current=page" if (h == path or (h != "/" and path.startswith(h))) else ""}>{t}</a>' for h, t in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><a class="logo" href="/" aria-label="Scroll California home">{LOGO}<span>Scroll <b>California</b></span></a>
<button class="menu" aria-label="Menu" aria-expanded="false" aria-controls="nav">&#9776;</button>
<nav class="nav" id="nav" aria-label="Main">{links}</nav></header>'''

FOOTER = f'''<footer class="ftr"><div class="wrap">
<div><a class="logo" href="/">{LOGO}<span>Scroll <b>California</b></span></a>
<p>California food and stays, on video. Every video on this site is filmed by our own studio, {STUDIO}. Paid placements are always labeled <strong>Sponsored</strong>.</p>
<p><a href="/newsletter/">Get new spots by email &rarr;</a></p></div>
<div><h2>Explore</h2><ul><li><a href="/">Watch</a></li><li><a href="/restaurants/">Restaurants</a></li><li><a href="/hotels/">Hotels</a></li><li><a href="/cities/">Cities</a></li></ul></div>
<div><h2>Businesses</h2><ul><li><a href="/submit/">Submit your spot</a></li><li><a href="/advertise/">Advertise</a></li><li><a href="/advertise/#media-kit">Media kit</a></li><li><a href="{IG}" rel="noopener">Instagram</a></li></ul></div>
<div><h2>About</h2><ul><li><a href="/about/">About</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms &amp; disclosures</a></li><li><a href="/privacy/#do-not-sell">Do Not Sell or Share</a></li></ul></div>
<p class="small" style="grid-column:1/-1;margin:0">&copy; 2026 Scroll California &middot; Made by <a href="{STUDIO_URL}" rel="noopener">{STUDIO}</a></p>
</div></footer>'''

def write(path, body, priority=None):
    out = ROOT / (path.lstrip("/") + ("index.html" if path.endswith("/") else ""))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body)
    if priority is not None: PAGES.append((path, priority))

def page(path, title, desc, main, priority=0.6, **kw):
    write(path, head(path, title, desc, **kw) + f"\n<body>\n{header(path)}\n<main id=\"main\">\n{main}\n</main>\n{FOOTER}\n</body></html>\n", priority)

def slot(name): return f'<aside class="sp-slot" data-slot="{name}" aria-label="Sponsored" hidden></aside>'
def vurl(v): return f"/videos/{v['slug']}/"
def purl(p): return f"/places/{p['slug']}/"
def curl(c): return f"/cities/{c['slug']}/"
def iso(sec): return f"PT{int(sec)}S"
def city_name(s): return CITIES[s]["name"] if s else ""
CATNAME = {"restaurants": "Restaurants", "hotels": "Hotels"}
def catlabel(v): return "Hotel dining" if set(v["cats"]) >= {"restaurants", "hotels"} else CATNAME[v["cats"][0]]

def video_ld(v):
    p = PLACES.get(v["place"]) if v["place"] else None
    j = {"@context": "https://schema.org", "@type": "VideoObject", "name": v["title"], "description": v["desc"],
         "thumbnailUrl": [f"{SITE_URL}/media/{v['slug']}.jpg"], "uploadDate": PUBLISHED + "T09:00:00-08:00",
         "duration": iso(v["duration"]), "contentUrl": f"{SITE_URL}/media/{v['slug']}.mp4", "embedUrl": SITE_URL + vurl(v),
         "url": SITE_URL + vurl(v), "creator": {"@type": "Organization", "name": STUDIO, "url": STUDIO_URL},
         "publisher": {"@type": "Organization", "name": "Scroll California", "url": SITE_URL, "logo": {"@type": "ImageObject", "url": f"{SITE_URL}/icon-512.png"}}}
    if p: j["contentLocation"] = {"@type": "Place", "name": p["name"], "address": addr_ld(p)}
    return j

def addr_ld(p): return {"@type": "PostalAddress", "streetAddress": p["street"], "addressLocality": CITIES[p["city"]]["name"], "addressRegion": "CA", "postalCode": p["zip"], "addressCountry": "US"}

def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u} for i, (n, u) in enumerate(items)]}
def crumbs_html(items): return '<p class="crumbs">' + " / ".join(f'<a href="{u}">{e(n)}</a>' for n, u in items[:-1]) + f' / <span>{e(items[-1][0])}</span></p>'

def tile(v):
    tag = city_name(v["city"]) or CATNAME[v["cats"][0]]
    return f'<a class="tile" href="{vurl(v)}"><img src="/media/{v["slug"]}.jpg" alt="" width="540" height="960" loading="lazy" decoding="async"><i>{e(tag)}</i><span>{e(v["title"])}</span></a>'

def disclosure(p):
    if not p or not p.get("client"): return ""
    return f'<p class="note"><strong>Disclosure:</strong> {STUDIO}, the studio that runs Scroll California, has filmed for {e(p["name"])} as a paid client. This page is not a paid ad. If that ever changes, we label it <strong>Sponsored</strong>.</p>'

# ---------------- HOME / FEED ----------------
def clip(v, i):
    p = PLACES.get(v["place"]) if v["place"] else None
    tag = " · ".join(x for x in [catlabel(v), city_name(v["city"])] if x)
    links = (f'<a href="{purl(p)}">See the spot</a>' if p else "") + f'<a class="alt" href="{vurl(v)}">Details</a>'
    credit = f"Filmed by {STUDIO}" + (" · paid client work" if p and p.get("client") else "")
    pin = f'<a href="{purl(p)}" aria-label="{e(p["name"])}: address and details">{I_PIN}</a>' if p else ""
    return f'''<li class="clip" id="v-{v["slug"]}" data-slug="{v["slug"]}" data-cats="all {" ".join(v["cats"])}">
<div class="stage">
<video muted playsinline loop preload="{"metadata" if i == 0 else "none"}" poster="/media/{v["slug"]}.jpg" data-src="/media/{v["slug"]}.mp4" aria-label="{e(v["title"])}" disableremoteplayback></video>
<button class="tap" aria-label="Play or pause: {e(v["title"])}"></button>
<div class="paused-ind"><span>{I_PLAY}</span></div>
<div class="shade"></div>
<div class="meta"><p class="tag">{e(tag)}</p><h2>{e(v["title"])}</h2><p class="desc">{e(v["desc"])}</p>
<div class="links">{links}</div><p class="credit">{credit}</p></div>
<div class="rail"><button type="button" data-share="{vurl(v)}" data-title="{e(v["title"])}" aria-label="Share this video">{I_SHARE}</button>{pin}</div>
</div></li>'''

def build_home():
    clips = "\n".join(clip(v, i) for i, v in enumerate(VIDEOS))
    cities = " ".join(f'<a class="pill" href="{curl(c)}">{e(c["name"])}</a>' for c in C["cities"])
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": "Scroll California", "url": SITE_URL + "/",
           "description": "California food and stays, on video."},
          {"@context": "https://schema.org", "@type": "Organization", "name": "Scroll California", "url": SITE_URL + "/", "logo": f"{SITE_URL}/icon-512.png",
           "sameAs": [IG, STUDIO_URL], "parentOrganization": {"@type": "Organization", "name": STUDIO, "url": STUDIO_URL}},
          {"@context": "https://schema.org", "@type": "ItemList", "name": "Latest videos", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + vurl(v)} for i, v in enumerate(VIDEOS)]}]
    extra = f'<link rel="preload" as="image" href="/media/{VIDEOS[0]["slug"]}.jpg" fetchpriority="high">\n'
    body = head("/", "Scroll California: California food & stays, on video", "Swipe through short videos of California restaurants, hotel dining and stays, all filmed by our own studio. New spots added every week.", jsonld=ld, extra=extra, htmlcls="feedhtml")
    body += f'''
<body class="feedpage">
{header("/")}
<main id="main">
<h1 class="sr">Scroll California: California food and stays, on video</h1>
<nav class="chips" aria-label="Filter videos"><a href="#all" aria-current="true">All</a><a href="#restaurants">Restaurants</a><a href="#hotels">Hotels</a></nav>
<ol class="feed" aria-label="Video feed">
{clips}
</ol>
<section class="endcard" aria-labelledby="more">
<div class="wrap narrow">
<p class="kicker">You reached the end (for now)</p>
<h2 id="more" style="margin-top:.2em">Hungry for more?</h2>
<p class="lead">Scroll California is new. We film every spot ourselves, so the list grows a few videos at a time instead of thousands of scraped clips. Here's where to go next.</p>
<div class="row" style="margin:14px 0 22px"><a class="btn" href="/restaurants/">Restaurants</a><a class="btn ghost" href="/hotels/">Hotels</a></div>
<h3>Cities</h3><p class="row">{cities}</p>
<h3>Get new spots by email</h3>
{news_form("home")}
<h3>Run a restaurant or hotel?</h3>
<p class="mute">Tell us about it, or ask about a sponsored feature. Every paid placement is labeled.</p>
<div class="row"><a class="btn ghost" href="/submit/">Submit your spot</a><a class="btn ghost" href="/advertise/">Advertise</a></div>
{slot("home")}
</div>
{FOOTER}
</section>
</main>
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

# ---------------- VIDEO PAGES ----------------
def build_videos():
    for v in VIDEOS:
        p = PLACES.get(v["place"]) if v["place"] else None
        items = [("Home", "/")] + ([(CITIES[v["city"]]["name"], curl(CITIES[v["city"]]))] if v["city"] else [(CATNAME[v["cats"][0]], f"/{v['cats'][0]}/")]) + [(v["title"], vurl(v))]
        facts = ""
        if p: facts += f'<li><b>Place</b><a href="{purl(p)}">{e(p["name"])}</a></li><li><b>Address</b>{e(p["street"])}, {e(city_name(p["city"]))}, CA {e(p["zip"])}</li>'
        facts += f'<li><b>Category</b>{" &amp; ".join(f"<a href=/{c}/>{CATNAME[c]}</a>" for c in v["cats"])}</li><li><b>Length</b>{v["duration"]} seconds</li><li><b>Filmed by</b><a href="{STUDIO_URL}" rel="noopener">{STUDIO}</a></li>'
        others = "".join(tile(o) for o in VIDEOS if o["slug"] != v["slug"])[:]
        venue_note = "" if p else '<p class="note">We\'re confirming the venue for this clip. If it\'s yours, <a href="/submit/">tell us</a>.</p>'
        main = f'''<div class="wrap"><div class="split">
<div class="player"><video controls playsinline muted preload="metadata" poster="/media/{v["slug"]}.jpg" width="720" height="1280"><source src="/media/{v["slug"]}.mp4" type="video/mp4"></video></div>
<div>{crumbs_html(items)}
<p class="kicker">{e(" · ".join(x for x in [catlabel(v), city_name(v["city"])] if x))}</p>
<h1>{e(v["title"])}</h1>
<p class="lead">{e(v["desc"])}</p>
<ul class="facts">{facts}</ul>
<div class="row" style="margin:18px 0"><button class="btn" type="button" data-share="{vurl(v)}" data-title="{e(v["title"])}">Share</button>{f'<a class="btn ghost" href="{purl(p)}">See the spot</a>' if p else ""}<a class="btn ghost" href="/#v-{v["slug"]}">Watch in the feed</a></div>
{disclosure(p)}{venue_note}
{slot("video:" + v["slug"])}
</div></div>
<h2>More videos</h2><div class="grid">{others}</div></div>'''
        page(vurl(v), f"{v['title']} | Scroll California", v["desc"][:155], main, 0.7,
             og_img=f"/og/{v['slug']}.jpg", og_type="video.other", jsonld=[video_ld(v), crumbs_ld(items)])

# ---------------- PLACE PAGES ----------------
def build_places():
    for p in C["places"]:
        c = CITIES[p["city"]]; vids = [v for v in VIDEOS if v["place"] == p["slug"]]
        food_first = sorted(vids, key=lambda v: 0 if "restaurants" in v["cats"] else 1)
        v0 = food_first[0]
        items = [("Home", "/"), (c["name"], curl(c)), (p["name"], purl(p))]
        maps = "https://www.google.com/maps/search/?api=1&query=" + re.sub(r"\s+", "+", f'{p["name"]} {p["street"]} {c["name"]} CA {p["zip"]}')
        why = "".join(f"<p>{e(x)}</p>" for x in p["why"])
        good = " ".join(f'<span class="pill">{e(g)}</span>' for g in p["good_for"])
        ld = {"@context": "https://schema.org", "@type": p["type"], "name": p["name"], "address": addr_ld(p), "url": p["website"],
              "image": [f"{SITE_URL}/media/{v['slug']}.jpg" for v in vids], "description": p["short"],
              "subjectOf": [video_ld(v) for v in vids], "mainEntityOfPage": SITE_URL + purl(p)}
        if p.get("cuisine"): ld["servesCuisine"] = p["cuisine"]
        if p.get("lat"): ld["geo"] = {"@type": "GeoCoordinates", "latitude": p["lat"], "longitude": p["lng"]}
        more = "".join(tile(v) for v in food_first)
        kind = "Restaurant" if p["type"] == "Restaurant" else "Hotel"
        host = re.sub(r"^https?://(www\.)?", "", p["website"]).split("/")[0]
        main = f'''<div class="wrap"><div class="split">
<div class="player"><video controls playsinline muted preload="metadata" poster="/media/{v0["slug"]}.jpg" width="720" height="1280"><source src="/media/{v0["slug"]}.mp4" type="video/mp4"></video></div>
<div>{crumbs_html(items)}
<p class="kicker">{kind} · {e(c["name"])}, CA</p>
<h1>{e(p["name"])}</h1>
<p class="lead">{e(p["short"])}</p>
<h2>Why go</h2>{why}
<p class="row">{good}</p>
<h2>Details</h2>
<ul class="facts"><li><b>Address</b><span>{e(p["street"])}, {e(c["name"])}, CA {e(p["zip"])}</span></li>
<li><b>Map</b><a href="{e(maps)}" rel="noopener">Open in Google Maps</a></li>
<li><b>Website</b><a href="{e(p["website"])}" rel="noopener">{e(host)}</a></li></ul>
<p class="small mute">Hours, menus and prices change, so check the official website before you go.</p>
<div class="row" style="margin:18px 0"><button class="btn" type="button" data-share="{purl(p)}" data-title="{e(p["name"])}">Share this spot</button></div>
{disclosure(p)}
{slot("place:" + p["slug"])}
</div></div>
<h2>Videos from {e(p["name"])}</h2><div class="grid">{more}</div>
<div class="card" style="margin-top:28px"><h3>Is this your business?</h3><p class="mute">Spot a mistake or want to add more? <a href="/submit/">Send us an update</a>. Changes are free.</p></div>
</div>'''
        title = f"{p['name']}, {c['name']} CA: video, address & why go"
        page(purl(p), title[:65] if len(title) <= 65 else f"{p['name']} ({c['name']}, CA) on video", f"{p['short']} Watch our video and get the address for {p['name']} in {c['name']}, California."[:158], main, 0.8,
             og_img=f"/og/{v0['slug']}.jpg", jsonld=[ld, crumbs_ld(items)])

# ---------------- CITIES / CATEGORIES ----------------
def place_card(p):
    c = CITIES[p["city"]]; v = sorted([v for v in VIDEOS if v["place"] == p["slug"]], key=lambda v: 0 if "restaurants" in v["cats"] else 1)[0]
    return f'''<a class="card" href="{purl(p)}" style="display:flex;gap:14px;text-decoration:none;color:inherit;padding:12px">
<img src="/media/{v["slug"]}.jpg" alt="" width="90" height="160" loading="lazy" style="width:90px;height:160px;object-fit:cover;border-radius:10px;flex:none">
<span><span class="kicker">{"Restaurant" if p["type"] == "Restaurant" else "Hotel"} · {e(c["name"])}</span><br><strong style="font-size:18px">{e(p["name"])}</strong><br><span class="mute">{e(p["short"])}</span></span></a>'''

def build_cities():
    for c in C["cities"]:
        ps = [p for p in C["places"] if p["city"] == c["slug"]]
        ps.sort(key=lambda p: 0 if p["type"] == "Restaurant" else 1)
        vids = [v for v in VIDEOS if v["city"] == c["slug"]]
        vids.sort(key=lambda v: 0 if "restaurants" in v["cats"] else 1)
        items = [("Home", "/"), ("Cities", "/cities/"), (c["name"], curl(c))]
        ld = [crumbs_ld(items), {"@context": "https://schema.org", "@type": "CollectionPage", "name": f"{c['name']}, CA food & stays on video", "url": SITE_URL + curl(c),
              "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + purl(p), "name": p["name"]} for i, p in enumerate(ps)]}}]
        main = f'''<div class="wrap">{crumbs_html(items)}
<p class="kicker">City guide · California</p>
<h1>{e(c["name"])} food &amp; stays, on video</h1>
<p class="lead">{e(c["intro"])}</p>
<h2>Spots we've filmed in {e(c["name"])}</h2>
<div class="cards">{"".join(place_card(p) for p in ps)}</div>
{slot("city:" + c["slug"])}
<h2>Videos</h2><div class="grid">{"".join(tile(v) for v in vids)}</div>
<div class="card" style="margin-top:28px"><h3>Know a great spot in {e(c["name"])}?</h3><p class="mute">We add places we've actually been to and filmed. <a href="/submit/">Suggest one</a>, or <a href="/newsletter/">get new {e(c["name"])} spots by email</a>.</p></div>
</div>'''
        page(curl(c), f"{c['name']}, CA food & stays on video | Scroll California", f"{c['intro']}"[:158], main, 0.8,
             og_img=f"/og/{vids[0]['slug']}.jpg", jsonld=ld)
    items = [("Home", "/"), ("Cities", "/cities/")]
    cards = "".join(f'<a class="card" href="{curl(c)}" style="text-decoration:none;color:inherit"><h3>{e(c["name"])}</h3><p class="mute">{e(c["intro"])}</p><span class="pill">{len([p for p in C["places"] if p["city"] == c["slug"]])} spot(s) · {len([v for v in VIDEOS if v["city"] == c["slug"]])} video(s)</span></a>' for c in C["cities"])
    page("/cities/", "California cities: food & stays on video | Scroll California", "Browse Scroll California by city: Vacaville, Fairfield, San Francisco and more California cities as we film them.", f'''<div class="wrap">{crumbs_html(items)}<h1>Cities</h1><p class="lead">We're filming our way across California, starting with these cities. More are on the way.</p><div class="cards">{cards}</div></div>''', 0.6, jsonld=[crumbs_ld(items)])

def build_cats():
    defs = {"restaurants": ("California restaurants on video", "Where to eat in California, on video: restaurants and hotel dining we've filmed ourselves, from Brazilian steakhouse nights to room service done right.",
                            "Restaurants and hotel dining we've filmed ourselves. Real places, real food, no stock footage."),
            "hotels": ("California hotels & hotel dining on video", "California hotels on video: lobbies, rooms and on-site dining at stays we've filmed ourselves, from downtown San Francisco to Fairfield.",
                       "Stays we've filmed ourselves, with a focus on what you'll eat and drink there.")}
    for cat, (h1, desc, lead) in defs.items():
        vids = [v for v in VIDEOS if cat in v["cats"]]
        if cat == "restaurants": vids.sort(key=lambda v: 0 if "hotels" not in v["cats"] else 1)
        ps = [PLACES[s] for s in dict.fromkeys(v["place"] for v in vids if v["place"])]
        if cat == "restaurants": ps.sort(key=lambda p: 0 if p["type"] == "Restaurant" else 1)
        items = [("Home", "/"), (CATNAME[cat], f"/{cat}/")]
        ld = [crumbs_ld(items), {"@context": "https://schema.org", "@type": "CollectionPage", "name": h1, "url": f"{SITE_URL}/{cat}/",
              "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE_URL + vurl(v), "name": v["title"]} for i, v in enumerate(vids)]}}]
        main = f'''<div class="wrap">{crumbs_html(items)}<p class="kicker">{CATNAME[cat]}</p><h1>{h1}</h1><p class="lead">{lead}</p>
<div class="row" style="margin:6px 0 18px"><a class="btn" href="/#{cat}">Swipe the {CATNAME[cat].lower()} feed</a></div>
<h2>Videos</h2><div class="grid">{"".join(tile(v) for v in vids)}</div>
<h2>Places</h2><div class="cards">{"".join(place_card(p) for p in ps)}</div>
{slot("category:" + cat)}
</div>'''
        page(f"/{cat}/", f"{h1} | Scroll California", desc[:158], main, 0.9, og_img=f"/og/{vids[0]['slug']}.jpg", jsonld=ld)

# ---------------- STATIC PAGES ----------------
def build_static():
    S = Path(ROOT / "_build/pages")
    for f in sorted(S.glob("*.html")):
        raw = f.read_text()
        m = re.match(r"<!--\s*(\{.*?\})\s*-->\n", raw, re.S)
        meta = json.loads(m.group(1)); body = raw[m.end():]
        body = body.replace("{{NEWS_FORM}}", news_form(meta["path"].strip("/") or "page")).replace("{{IG}}", IG).replace("{{STUDIO_URL}}", STUDIO_URL)
        page(meta["path"], meta["title"], meta["desc"], body, meta.get("priority", 0.5), jsonld=meta.get("jsonld"))

REDIRECTS = {"/media-kit/": "/advertise/#media-kit", "/get-featured/": "/advertise/", "/apply/": "/submit/", "/claim/": "/submit/",
             "/contact/": "/submit/", "/watch/": "/", "/disclosures/": "/terms/", "/privacy/do-not-sell/": "/privacy/#do-not-sell",
             "/cookies/": "/privacy/", "/checkout/": "/advertise/", "/hire-a-creator/": "/advertise/", "/solano-north-bay/": "/cities/",
             "/bay-area/": "/cities/", "/los-angeles/": "/cities/", "/search/": "/", "/category/": "/restaurants/", "/best/": "/restaurants/"}
def build_redirects():
    for src, dst in REDIRECTS.items():
        write(src, f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="{SITE_URL}{dst.split("#")[0]}"><meta http-equiv="refresh" content="0;url={dst}"></head><body><p>This page moved to <a href="{dst}">{SITE_URL}{dst}</a>.</p></body></html>\n')

def build_404():
    body = head("/404.html", "Page not found | Scroll California", "That page isn't here.", robots="noindex,follow") + f'''
<body>{header("/404")}<main id="main"><div class="wrap narrow"><p class="kicker">404</p><h1>That page isn't here.</h1>
<p class="lead">Scroll California was rebuilt in November 2026 and a lot of old pages were retired. Start with the feed, or browse by city.</p>
<div class="row"><a class="btn" href="/">Watch the feed</a><a class="btn ghost" href="/cities/">Cities</a><a class="btn ghost" href="/restaurants/">Restaurants</a></div></div></main>{FOOTER}</body></html>'''
    (ROOT / "404.html").write_text(body)

def build_seo_files():
    (ROOT / "robots.txt").write_text(("User-agent: *\nAllow: /\nDisallow: /_build/\n\n" if INDEX else "User-agent: *\nDisallow: /\n\n") + f"Sitemap: {SITE_URL}/sitemap.xml\n")
    vids = {vurl(v): v for v in VIDEOS}
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    for path, pr in PAGES:
        out.append(f"  <url>\n    <loc>{SITE_URL}{path}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <priority>{pr:.1f}</priority>")
        if path in vids:
            v = vids[path]
            out.append(f"    <video:video>\n      <video:thumbnail_loc>{SITE_URL}/media/{v['slug']}.jpg</video:thumbnail_loc>\n      <video:title>{e(v['title'])}</video:title>\n      <video:description>{e(v['desc'])}</video:description>\n      <video:content_loc>{SITE_URL}/media/{v['slug']}.mp4</video:content_loc>\n      <video:duration>{v['duration']}</video:duration>\n      <video:publication_date>{PUBLISHED}T09:00:00-08:00</video:publication_date>\n      <video:family_friendly>yes</video:family_friendly>\n    </video:video>")
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
        im = Image.new("RGB", (1200, 630), (11, 10, 8))
        bg = Image.open(ROOT / "media" / posters[0]).convert("RGB").resize((1200, 2133)).crop((0, 750, 1200, 1380)).filter(ImageFilter.GaussianBlur(28))
        im.paste(Image.blend(bg, Image.new("RGB", bg.size, (11, 10, 8)), 0.62))
        x = 1200 - 40
        for p in reversed(posters[:3]):
            t = Image.open(ROOT / "media" / p).convert("RGB").resize((300, 533)); x -= 300
            im.paste(t, (x, 48)); x -= 16
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((60, 60, 112, 112), 14, fill=(217, 168, 69)); d.polygon([(80, 74), (80, 98), (100, 86)], fill=(20, 15, 5))
        d.text((128, 70), "Scroll California", font=font(30), fill=(244, 239, 230))
        tw = x - 60 - 20; y = 190
        for ln in wrap(d, title, font(50), tw)[:4]:
            d.text((60, y), ln, font=font(50), fill=(255, 255, 255)); y += 62
        d.text((60, y + 14), sub, font=font(26), fill=(240, 199, 102))
        im.save(ROOT / "og" / name, quality=82, optimize=True, progressive=True)
    make("og-default.jpg", [f"{v['slug']}.jpg" for v in VIDEOS[:3]], "California food & stays, on video", "Filmed by our own studio")
    for v in VIDEOS:
        p = PLACES.get(v["place"]) if v["place"] else None
        make(f"{v['slug']}.jpg", [f"{v['slug']}.jpg"], v["title"], (city_name(v["city"]) + ", CA") if v["city"] else "California")

if __name__ == "__main__":
    build_og(); build_home(); build_cats(); build_cities(); build_places(); build_videos(); build_static(); build_redirects(); build_404(); build_seo_files()
    print(f"Built {len(PAGES)} indexable pages, {len(REDIRECTS)} redirects. robots={ROBOTS}")
