export const runtime = "edge";

/* ── Radio station stream URLs ── */
const STATIONS: Record<string, { url: string; type: "hls" | "aac-redirect" | "hls-api" }> = {
  kbs1:      { url: "https://kong.kbs.co.kr/listener?channel=21&client=codec_ABR&type=HLS", type: "hls" },
  kbsclassic:{ url: "https://kong.kbs.co.kr/listener?channel=24&client=codec_ABR&type=HLS", type: "hls" },
  kbscool:   { url: "https://kong.kbs.co.kr/listener?channel=22&client=codec_ABR&type=HLS", type: "hls" },
  kbshappy:  { url: "https://kong.kbs.co.kr/listener?channel=23&client=codec_ABR&type=HLS", type: "hls" },
  mbcsfm:    { url: "https://sminiplay.imbc.com/aacplay.ashx?agent=webapp&channel=sfm", type: "aac-redirect" },
  mbcfm4u:   { url: "https://sminiplay.imbc.com/aacplay.ashx?agent=webapp&channel=mfm", type: "aac-redirect" },
  sbslove:   { url: "https://apis.sbs.co.kr/play-api/1.0/livestream/lovefm/lovefm?protocol=hls&ssl=Y", type: "hls-api" },
  sbspower:  { url: "https://apis.sbs.co.kr/play-api/1.0/livestream/powerfm/powerfm?protocol=hls&ssl=Y", type: "hls-api" },
  cbsfm:     { url: "https://aac.cbs.co.kr/cbs939/cbs939.stream/playlist.m3u8", type: "hls" },
  cbsmusic:  { url: "https://aac.cbs.co.kr/mfm981/mfm981.stream/playlist.m3u8", type: "hls" },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station");
  const proxyUrl = searchParams.get("url"); // for proxying HLS segments

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "no-cache, no-store",
  };

  try {
    // ── Proxy arbitrary URL (for HLS segments) ──
    if (proxyUrl) {
      const res = await fetch(proxyUrl);
      const ct = res.headers.get("Content-Type") || "application/octet-stream";
      return new Response(res.body, {
        headers: { ...headers, "Content-Type": ct },
      });
    }

    // ── Station lookup ──
    if (!stationId || !STATIONS[stationId]) {
      return new Response(JSON.stringify({ error: "Unknown station", available: Object.keys(STATIONS) }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const station = STATIONS[stationId];

    // ── SBS: API returns plain-text HLS URL ──
    if (station.type === "hls-api") {
      const res = await fetch(station.url);
      const streamUrl = (await res.text()).trim();
      // Fetch the actual m3u8 and rewrite segment URLs to go through proxy
      const m3u8Res = await fetch(streamUrl);
      const m3u8Text = await m3u8Res.text();
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf("/") + 1);
      const rewritten = rewriteM3u8(m3u8Text, baseUrl);
      return new Response(rewritten, {
        headers: { ...headers, "Content-Type": "application/vnd.apple.mpegurl" },
      });
    }

    // ── MBC: returns redirect to AAC stream URL ──
    if (station.type === "aac-redirect") {
      const res = await fetch(station.url, { redirect: "follow" });
      const streamUrl = res.url;
      // Return the resolved URL for the client to play directly
      return new Response(JSON.stringify({ streamUrl }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // ── HLS: proxy the m3u8 and rewrite segment URLs ──
    if (station.type === "hls") {
      const res = await fetch(station.url, { redirect: "follow" });
      const text = await res.text();
      const finalUrl = res.url;
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
      const rewritten = rewriteM3u8(text, baseUrl);
      return new Response(rewritten, {
        headers: { ...headers, "Content-Type": "application/vnd.apple.mpegurl" },
      });
    }

    return new Response("Unknown type", { status: 500, headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}

/**
 * Rewrite relative/absolute URLs in m3u8 playlist to go through our proxy.
 */
function rewriteM3u8(text: string, baseUrl: string): string {
  const proxyBase = "/api/radio-proxy?url=";
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        // Rewrite URI in #EXT-X-MAP or #EXT-X-KEY
        if (trimmed.includes("URI=")) {
          return trimmed.replace(/URI="([^"]+)"/, (_match, uri) => {
            const fullUrl = uri.startsWith("http") ? uri : baseUrl + uri;
            return `URI="${proxyBase}${encodeURIComponent(fullUrl)}"`;
          });
        }
        return line;
      }
      // It's a segment URL
      const fullUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed;
      return proxyBase + encodeURIComponent(fullUrl);
    })
    .join("\n");
}
