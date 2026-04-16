/**
 * YouTube Search via Piped API (open-source YouTube frontend)
 * Returns clean JSON — no HTML scraping, no API key needed.
 */

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.r4fo.com",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  // Try each Piped instance until one works
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(q)}&filter=videos`,
        {
          headers: { "User-Agent": "Ello-Care/1.0" },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const items = data.items || data;

      if (Array.isArray(items) && items.length > 0) {
        // Extract video ID from URL like "/watch?v=ABC123"
        const videoIds: string[] = [];
        for (const item of items) {
          const url = item.url || "";
          const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          if (match && !videoIds.includes(match[1])) {
            videoIds.push(match[1]);
          }
          if (videoIds.length >= 5) break;
        }

        if (videoIds.length > 0) {
          return Response.json({
            videoId: videoIds[0],
            videoIds: videoIds.slice(0, 5),
            query: q,
            source: instance,
          });
        }
      }
    } catch {
      // Try next instance
      continue;
    }
  }

  // Fallback: Try YouTube oembed approach
  // (won't find new videos, but can validate known ones)
  try {
    const ytRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    const html = await ytRes.text();
    const videoIds: string[] = [];
    const matches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    for (const m of matches) {
      if (!videoIds.includes(m[1])) videoIds.push(m[1]);
      if (videoIds.length >= 3) break;
    }
    if (videoIds.length > 0) {
      return Response.json({ videoId: videoIds[0], videoIds, query: q, source: "youtube-fallback" });
    }
  } catch { /* ignore */ }

  return Response.json({ error: "No results found", videoId: null, query: q }, { status: 200 });
}
