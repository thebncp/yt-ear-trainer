// ====== CONFIG ======
// Option A (recommended): put your own default playlist ID here.
const DEFAULT_PLAYLIST_ID = "PL8e1s4piN_DzrmcNLGYCXjjmIP5tkbZpE";

// Option B: enable user-pasted playlists via YouTube Data API.
// For a quick prototype you can put the API key here. If you ever publish,
// move this to a tiny serverless proxy so the key isn't exposed.
const YT_DATA_API_KEY = "AIzaSyA7XclalOiKTmPRlfER5qWDkw1HhHSAC8Q";

function parsePlaylistIdFromUrl(url) {
  try {
    const u = new URL(url);
    // playlist URL or watch URL with list param
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

async function fetchPlaylistItems(playlistId) {
  // Fetch all items (pagination). Returns array of { videoId, title, channelTitle }
  if (!YT_DATA_API_KEY || YT_DATA_API_KEY.startsWith("PUT_")) {
    throw new Error("Missing YouTube Data API key. Set YT_DATA_API_KEY in js/playlist.js.");
  }

  const items = [];
  let pageToken = "";

  while (true) {
    const params = new URLSearchParams({
      key: YT_DATA_API_KEY,
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const resp = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`playlistItems.list failed (${resp.status}). ${text}`);
    }

    const data = await resp.json();
    for (const it of (data.items || [])) {
      const videoId = it?.contentDetails?.videoId;
      if (!videoId) continue;

      const title = it?.snippet?.title || "—";
      // Often present; if not, we’ll just show "—" in strict mode.
      const channelTitle =
        it?.snippet?.videoOwnerChannelTitle ||
        it?.snippet?.channelTitle ||
        "—";

      items.push({ videoId, title, channelTitle });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  // Filter out "Private video"/"Deleted video" placeholders where possible
  return items.filter(x => x.videoId && x.title !== "Private video" && x.title !== "Deleted video");
}
