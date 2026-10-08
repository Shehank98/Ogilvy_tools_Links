// Feature flags for public sections. Flip to true to bring a section back —
// nav links and routes react automatically. Admin CRUD stays available either way.
export const FEATURES = {
  // Require staff to sign in (Ogilvy email + password + emailed code) before
  // using the hub. Adds the Report and My Tickets sections.
  userLogin: true,
  workshops: false,
  tips: false,
  requests: false,
  // Show tool logos on the public cards (in the card's header band).
  toolLogos: true,
} as const;
