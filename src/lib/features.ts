// Feature flags for public sections. Flip to true to bring a section back —
// nav links and routes react automatically. Admin CRUD stays available either way.
export const FEATURES = {
  workshops: false,
  tips: false,
  requests: false,
} as const;
