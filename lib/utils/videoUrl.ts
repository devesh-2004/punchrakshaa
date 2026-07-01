export type ParsedVideo =
  | { type: "youtube"; embedUrl: string; watchUrl: string; shortsUrl: string }
  | { type: "drive"; embedUrl: string }
  | null;

const YT_PARAMS = "autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1";

function makeYoutube(id: string): ParsedVideo {
  if (!id) return null;
  return {
    type: "youtube",
    embedUrl: `https://www.youtube.com/embed/${id}?${YT_PARAMS}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    shortsUrl: `https://www.youtube.com/shorts/${id}`,
  };
}

/**
 * Parses any of these into an embed URL:
 *   - Raw YouTube video ID (11 alphanum chars)
 *   - youtube.com/watch?v=ID
 *   - youtube.com/shorts/ID
 *   - youtu.be/ID
 *   - drive.google.com/file/d/ID/view
 * Returns null for empty / unrecognized input (caller should show fallback).
 */
export function parseVideoUrl(raw: string | undefined | null): ParsedVideo {
  if (!raw || raw.trim() === "") return null;

  const s = raw.trim();

  // Raw YouTube ID — 11 chars [a-zA-Z0-9_-]
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) {
    return makeYoutube(s);
  }

  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const hostname = url.hostname.replace(/^www\./, "");

    // youtube.com/watch?v=ID
    if (hostname === "youtube.com" && url.searchParams.has("v")) {
      return makeYoutube(url.searchParams.get("v")!);
    }

    // youtube.com/shorts/ID
    if (hostname === "youtube.com" && url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.replace("/shorts/", "").split("?")[0].split("/")[0];
      return makeYoutube(id);
    }

    // youtube.com/embed/ID (already an embed URL)
    if (hostname === "youtube.com" && url.pathname.startsWith("/embed/")) {
      const id = url.pathname.replace("/embed/", "").split("?")[0].split("/")[0];
      return makeYoutube(id);
    }

    // youtu.be/ID
    if (hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("?")[0];
      return makeYoutube(id);
    }

    // drive.google.com/file/d/FILE_ID/view
    if (hostname === "drive.google.com") {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match) {
        return {
          type: "drive",
          embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        };
      }
    }
  } catch {
    // Not a parseable URL and not a raw ID
  }

  return null;
}
