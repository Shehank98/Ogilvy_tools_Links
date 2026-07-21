// Feature flags for public sections. Flip to true to bring a section back —
// nav links and routes react automatically. Admin CRUD stays available either way.
export const FEATURES = {
  workshops: false,
  tips: false,
  requests: false,
  // Show tool logos on the public cards. Turned off while logo images are
  // low-res/inconsistent; flip to true to bring the logo tiles back.
  toolLogos: false,
} as const;
