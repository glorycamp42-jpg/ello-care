/**
 * YouTube Search Proxy
 * Searches YouTube server-side and returns the first video ID.
 * Client can then embed: https://www.youtube.com/embed/VIDEO_ID
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    // Fetch YouTube search results page server-side (no CORS issue)
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        },
      }
    );

    const html = await res.text();

    // Extract video IDs from the YouTube response
    // YouTube embeds video data as JSON in the page
    const videoIds: string[] = [];

    // Method 1: Look for "videoId" in the JSON data
    const jsonMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    for (const match of jsonMatches) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
      }
      if (videoIds.length >= 5) break;
    }

    // Method 2: Look for /watch?v= patterns
    if (videoIds.length === 0) {
      const watchMatches = html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
      for (const match of watchMatches) {
        if (!videoIds.includes(match[1])) {
          videoIds.push(match[1]);
        }
        if (videoIds.length >= 5) break;
      }
    }

    if (videoIds.length === 0) {
      return Response.json({ error: "No videos found", videoId: null }, { status: 200 });
    }

    return Response.json({
      videoId: videoIds[0],
      videoIds: videoIds.slice(0, 5),
      query: q,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return Response.json({ error: msg, videoId: null }, { status: 500 });
  }
}
