#!/usr/bin/env tsx
/**
 * Ping IndexNow (Bing + Yandex) so new/updated URLs get crawled fast — the
 * single biggest lever for Bing indexing speed. Google does NOT use IndexNow,
 * so this complements (doesn't replace) the Google sitemap/Search Console flow.
 *
 * The key file must be LIVE first: https://uncoverd.org/<KEY>.txt (in public/).
 * So the flow is: commit + deploy, THEN run this.
 *
 *   pnpm indexnow                     # homepage + /blog + /news + recent posts
 *   pnpm indexnow /blog/some-slug ... # submit specific paths or full URLs
 */
import fs from "node:fs";
import path from "node:path";

const HOST = "uncoverd.org";
const KEY = "7b1e4c08a9f24d3e8c5b06a1f9d2e3c4";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const BASE = `https://${HOST}`;

// Most-recently-modified blog posts across every locale → their public URLs.
function recentBlogUrls(limit = 30): string[] {
  const blogDir = path.join(process.cwd(), "content", "blog");
  if (!fs.existsSync(blogDir)) return [];
  const out: { url: string; mtime: number }[] = [];
  for (const loc of fs.readdirSync(blogDir)) {
    const dir = path.join(blogDir, loc);
    if (!fs.statSync(dir).isDirectory()) continue;
    const prefix = loc === "en" ? "/blog" : `/${loc}/blog`;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      out.push({
        url: `${BASE}${prefix}/${f.replace(/\.md$/, "")}`,
        mtime: fs.statSync(path.join(dir, f)).mtimeMs,
      });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, limit).map((f) => f.url);
}

function normalize(u: string): string {
  if (/^https?:\/\//.test(u)) return u;
  return `${BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter(Boolean);
  let urlList = args.length
    ? args.map(normalize)
    : [`${BASE}/`, `${BASE}/blog`, `${BASE}/news`, ...recentBlogUrls()];
  urlList = Array.from(new Set(urlList)).slice(0, 10000);
  if (urlList.length === 0) {
    console.error("No URLs to submit.");
    process.exit(1);
  }

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow (Bing + Yandex)…`);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  console.log(`IndexNow responded: ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 202) {
    console.log("✓ Accepted — Bing/Yandex will crawl these shortly.");
  } else {
    const body = await res.text().catch(() => "");
    if (body) console.log("Body:", body.slice(0, 500));
    if (res.status === 403)
      console.log(`403 = key file not reachable. Deploy public/${KEY}.txt first (live at ${KEY_LOCATION}), then re-run.`);
  }
  for (const u of urlList) console.log("  " + u);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
