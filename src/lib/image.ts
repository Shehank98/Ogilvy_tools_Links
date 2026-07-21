// Turns common "share" URLs into direct-image URLs that an <img> tag can load.
// Google Drive is the main offender: a share link points at an HTML viewer
// page, not the image bytes, so it never renders inside an <img>.
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Extract a Google Drive file id from any of its common link shapes:
  //   https://drive.google.com/file/d/<id>/view?usp=sharing
  //   https://drive.google.com/open?id=<id>
  //   https://drive.google.com/uc?id=<id>&export=download
  const driveId =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];

  if (driveId && trimmed.includes("drive.google.com")) {
    // lh3.googleusercontent.com serves the raw image and, unlike the older
    // uc?export=view endpoint, is not rate-limited or redirected to a warning.
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return trimmed;
}
