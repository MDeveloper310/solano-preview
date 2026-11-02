#!/usr/bin/env python3
"""
Scroll California: publish approved visitor uploads as static files.

Runs in GitHub Actions (.github/workflows/publish-uploads.yml) every hour and on demand.
Needs two environment variables (GitHub repo secrets):
  SUPABASE_URL         https://<project-ref>.supabase.co
  SUPABASE_SECRET_KEY  the project's SECRET key (sb_secret_...) or legacy service_role key.
                       NEVER put this key in assets/config.js or any file in the repo.

For each video with status=approved and no public_slug:
  1. download the original from the private "uploads" bucket
  2. check it with ffprobe (real video stream, <= 61 s)
  3. re-encode with ffmpeg: strips ALL metadata (GPS, device), 720x1280 vertical,
     H.264, max 60 s, HDR tonemapped, muted unless the uploader said the sound is theirs
  4. write media/ugc/<slug>.mp4 + .jpg poster, add an entry to _build/ugc.json
  5. set public_slug + published_at on the row and delete the original from storage
For each video set to removed/rejected that has a public_slug: delete its files and entry.
Also mirrors admin-created places/cities into _build/ugc_places.json / ugc_cities.json.
Then runs _build/build.py. Committing is done by the workflow.
Use --dry-run to only print what would happen.
"""
import datetime, json, os, re, shutil, subprocess, sys, tempfile, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
BUCKET = os.environ.get("UPLOADS_BUCKET", "uploads")
DRY = "--dry-run" in sys.argv
MAX_PER_RUN = 20
UGC_JSON, PLACES_JSON, CITIES_JSON = ROOT / "_build/ugc.json", ROOT / "_build/ugc_places.json", ROOT / "_build/ugc_cities.json"
CONTENT = json.load(open(ROOT / "_build/content.json"))
MEDIA = ROOT / "media/ugc"

def die(msg): print("ERROR:", msg); sys.exit(1)
if not URL or not KEY: die("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (GitHub > Settings > Secrets and variables > Actions).")
if KEY.startswith("sb_publishable_"): die("SUPABASE_SECRET_KEY is the publishable key. Use the SECRET key (sb_secret_...).")

def headers(extra=None):
    h = {"apikey": KEY}
    if KEY.count(".") == 2: h["Authorization"] = "Bearer " + KEY   # legacy JWT service_role key
    h.update(extra or {}); return h

def req(method, path, body=None, extra=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    hd = headers(extra)
    if data is not None: hd["Content-Type"] = "application/json"
    r = urllib.request.Request(URL + path, data=data, method=method, headers=hd)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            b = resp.read(); return b if raw else (json.loads(b) if b else None)
    except urllib.error.HTTPError as e:
        die(f"{method} {path} -> {e.code}: {e.read()[:300]!r}")

def rest(method, table, query="", body=None, prefer=None):
    return req(method, f"/rest/v1/{table}{'?' + query if query else ''}", body, {"Prefer": prefer} if prefer else None)

def load(p): return json.load(open(p)) if p.exists() else []
def save(p, data):
    if DRY: print("  (dry) would write", p.relative_to(ROOT)); return
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")

def slugify(s): return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (s or "").lower())).strip("-")[:60]

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0: raise RuntimeError(" ".join(cmd[:3]) + "... failed: " + p.stderr[-600:])
    return p.stdout

TM = ("zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0:peak=4,"
      "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,")
FIT = "scale=720:1280:force_original_aspect_ratio=decrease:flags=lanczos,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"

def encode(src, out_mp4, out_jpg, keep_audio):
    info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", src]))
    vs = [s for s in info.get("streams", []) if s.get("codec_type") == "video"]
    if not vs: raise RuntimeError("no video stream")
    dur = float(info.get("format", {}).get("duration") or vs[0].get("duration") or 0)
    if dur < 2 or dur > 61.5: raise RuntimeError(f"duration {dur:.1f}s outside 3-60s")
    hdr = vs[0].get("color_transfer") in ("arib-std-b67", "smpte2084")
    has_audio = any(s.get("codec_type") == "audio" for s in info["streams"])
    vf = (TM if hdr else "") + FIT + ",format=yuv420p"
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src, "-t", "60", "-map", "0:v:0", "-map_metadata", "-1", "-map_chapters", "-1",
           "-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "27", "-maxrate", "1500k", "-bufsize", "3000k",
           "-r", "30", "-movflags", "+faststart", "-metadata", "title=", "-metadata", "comment=Scroll California"]
    if keep_audio and has_audio: cmd[cmd.index("-map_metadata"):cmd.index("-map_metadata")] = ["-map", "0:a:0"]; cmd += ["-c:a", "aac", "-b:a", "96k", "-ac", "2"]
    else: cmd += ["-an"]
    run(cmd + [out_mp4])
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(min(1.0, dur / 3)), "-i", out_mp4, "-frames:v", "1", "-q:v", "4", out_jpg])
    return round(min(dur, 60)), bool(keep_audio and has_audio)

def mirror_places_and_cities():
    places = rest("GET", "places", "select=*&order=created_at")
    save(PLACES_JSON, [{"slug": p["slug"], "name": p["name"], "type": "Restaurant", "cuisine": p.get("cuisine") or "",
                        "category": "restaurants", "city": p["city_slug"], "street": p.get("street") or "", "zip": p.get("zip") or "",
                        **({"lat": p["lat"], "lng": p["lng"]} if p.get("lat") is not None else {}),
                        "website": p.get("website") or "", "short": "", "why": [], "good_for": [], "ugc": True} for p in places])
    cities = rest("GET", "cities", "select=*&order=created_at")
    save(CITIES_JSON, [{"slug": c["slug"], "name": c["name"], "intro": c.get("intro") or f"Food videos from {c['name']}, California.",
                        **({"lat": c["lat"], "lng": c["lng"]} if c.get("lat") is not None else {})} for c in cities])
    return {p["slug"] for p in CONTENT["places"]} | {p["slug"] for p in places}, {c["slug"] for c in CONTENT["cities"]} | {c["slug"] for c in cities}

def main():
    changed = False
    known_places, known_cities = mirror_places_and_cities()
    ugc = load(UGC_JSON)
    dishes = {d["slug"]: d for d in CONTENT["dishes"]}
    MEDIA.mkdir(parents=True, exist_ok=True)

    # 1) takedowns
    gone = rest("GET", "videos", "select=id,public_slug&status=in.(removed,rejected)&public_slug=not.is.null")
    gone_slugs = {g["public_slug"] for g in gone}
    if gone_slugs & {v["slug"] for v in ugc}:
        for s in gone_slugs:
            for ext in (".mp4", ".jpg"):
                f = MEDIA / (s + ext)
                if f.exists() and not DRY: f.unlink()
            for d in (ROOT / "videos" / s, ROOT / "og" / (s + ".jpg")):
                if d.exists() and not DRY: shutil.rmtree(d) if d.is_dir() else d.unlink()
        ugc = [v for v in ugc if v["slug"] not in gone_slugs]
        print("Removed:", ", ".join(sorted(gone_slugs)))
        changed = True

    # 2) newly approved
    todo = rest("GET", "videos", f"select=*&status=eq.approved&public_slug=is.null&order=reviewed_at&limit={MAX_PER_RUN}")
    print(f"{len(todo)} approved video(s) to publish")
    for r in todo:
        if r.get("place_slug") and r["place_slug"] not in known_places:
            print(f"  skip {r['id']}: place '{r['place_slug']}' doesn't exist yet. Create it on the admin page first."); continue
        if r["city_slug"] not in known_cities:
            print(f"  skip {r['id']}: city '{r['city_slug']}' doesn't exist yet. Add it to the cities table first."); continue
        if not r.get("place_slug"):
            print(f"  skip {r['id']}: no place chosen. Pick or create the place on the admin page."); continue
        slug = "-".join(x for x in (slugify(r["dish_slug"]), slugify(r["place_slug"])[:40], r["id"][:6]) if x)
        print("  publishing", r["id"], "->", slug)
        if DRY: continue
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "in" + os.path.splitext(r["storage_path"])[1])
            Path(src).write_bytes(req("GET", f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(r['storage_path'])}", raw=True))
            try:
                dur, audio = encode(src, str(MEDIA / (slug + ".mp4")), str(MEDIA / (slug + ".jpg")), r.get("keep_audio"))
            except Exception as ex:
                print("    encode failed, sending back to review:", ex)
                rest("PATCH", "videos", f"id=eq.{r['id']}", {"status": "pending", "review_note": ("Could not process the file: " + str(ex))[:380]}); continue
        dish = dishes.get(r["dish_slug"], {"name": r["dish_slug"]})
        place = next((p for p in CONTENT["places"] + load(PLACES_JSON) if p["slug"] == r["place_slug"]), {})
        cap = r["caption"].strip()
        ugc.append({"slug": slug, "title": (cap[:70] + ("…" if len(cap) > 70 else "")), "desc": cap,
                    "place": r["place_slug"], "city": r["city_slug"], "cats": [place.get("category", "restaurants")],
                    "dishes": [r["dish_slug"]], "food": True, "duration": dur, "audio": audio,
                    "creator": {"name": (r.get("credit_name") or "").strip() or "a visitor", "owned": False},
                    "uploaded": (r.get("created_at") or datetime.date.today().isoformat())[:10]})
        rest("PATCH", "videos", f"id=eq.{r['id']}", {"public_slug": slug, "published_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
        req("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": [r["storage_path"]]})
        changed = True

    # 3) originals of rejected videos older than a day: delete from storage
    old = rest("GET", "videos", "select=id,storage_path&status=eq.rejected&reviewed_at=lt." + (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat().replace("+00:00", "Z"))
    if old and not DRY: req("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": [o["storage_path"] for o in old]})

    save(UGC_JSON, ugc)
    if not DRY:
        subprocess.run([sys.executable, str(ROOT / "_build/build.py")], check=True)
    print("done; changed" if changed else "done; nothing new")

if __name__ == "__main__":
    main()
