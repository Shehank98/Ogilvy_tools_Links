// Placeholder logo marks (the real app shows each tool's own Logo URL).
const MARK = {
  canvas: `<svg viewBox="0 0 64 64"><g><rect x="6" y="14" width="14" height="14" rx="4" fill="#1b8fb4"/><rect x="24" y="6" width="14" height="14" rx="4" fill="#27b6c4"/><rect x="24" y="24" width="14" height="14" rx="4" fill="#0f6f99"/><rect x="42" y="14" width="14" height="14" rx="4" fill="#5fd3d0"/><rect x="14" y="34" width="14" height="14" rx="4" fill="#27b6c4"/><rect x="34" y="42" width="14" height="14" rx="4" fill="#1b8fb4"/></g></svg>`,
  brief: `<svg viewBox="0 0 64 64" fill="none" stroke="#ee3124" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h20l12 12v32a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"/><path d="M38 8v12h12M22 32h20M22 42h20"/></svg>`,
  resize: `<svg viewBox="0 0 64 64" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 24V12h12M52 24V12H40M12 40v12h12M52 40v12H40"/><rect x="22" y="22" width="20" height="20" rx="3"/></svg>`,
  report: `<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="34" width="10" height="20" rx="3" fill="#0ea5e9"/><rect x="27" y="20" width="10" height="34" rx="3" fill="#0284c7"/><rect x="44" y="8" width="10" height="46" rx="3" fill="#075985"/></svg>`,
  copy: `<svg viewBox="0 0 64 64" fill="none" stroke="#059669" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="22"/><path d="m21 33 8 8 15-17"/></svg>`,
  media: `<svg viewBox="0 0 64 64" fill="none" stroke="#d97706" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="48" height="44" rx="6"/><path d="M8 26h48M20 6v10M44 6v10M20 38h6M32 38h6M20 47h6"/></svg>`,
  pitch: `<svg viewBox="0 0 64 64" fill="#db2777"><path d="M32 6l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/><path d="M50 40l2.5 7 7 2.5-7 2.5L50 59l-2.5-7-7-2.5 7-2.5z" opacity=".7"/></svg>`,
  budget: `<svg viewBox="0 0 64 64" fill="none" stroke="#ca8a04" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="32" cy="16" rx="20" ry="8"/><path d="M12 16v16c0 4.4 9 8 20 8s20-3.6 20-8V16M12 32v16c0 4.4 9 8 20 8s20-3.6 20-8V32"/></svg>`,
};
const TOOLS = [
  { id:'canvas', name:'Incremetrics Canvas', tint:'#e6f6fa', mark:MARK.canvas, short:'Canvas' },
  { id:'brief',  name:'Brief Builder',       tint:'#fdecea', mark:MARK.brief,  short:'Brief' },
  { id:'resize', name:'Asset Resizer',       tint:'#f1ebfe', mark:MARK.resize, short:'Resizer' },
  { id:'report', name:'Report Pilot',        tint:'#e4f3fc', mark:MARK.report, short:'Report', beta:true },
  { id:'copy',   name:'Copy Checker',        tint:'#e3f6ee', mark:MARK.copy,   short:'Copy' },
  { id:'media',  name:'Media Planner',       tint:'#fdf1dc', mark:MARK.media,  short:'Planner' },
  { id:'pitch',  name:'Pitch Deck AI',       tint:'#fce8f1', mark:MARK.pitch,  short:'Pitch' },
  { id:'budget', name:'Budget Tracker',      tint:'#fdf6d8', mark:MARK.budget, short:'Budget' },
];
const logo = (t, size) => `<div class="logo" style="background:${t.tint};${size?`width:${size}px;height:${size}px;border-radius:${size*.25}px`:''}">${t.mark.replace('<svg',`<svg style="${size?`width:${size*.57}px;height:${size*.57}px`:''}"`)}</div>`;
const NAV = `<div class="nav"><div class="brand"><b>Ogilvy</b><span>TOOLS HUB</span></div><div class="pills"><a class="on">Tools</a><a>Report to us</a><a>My Tickets</a></div><div class="who">Asha Fernando <i>Sign out</i></div></div>`;
const ANAV = (on) => `<div class="anav"><div class="t">Tools Hub <em>ADMIN</em></div>${['Dashboard','Tools','Tool access','Coming Soon','Feedback','Notices'].map(x=>`<a class="${x===on?'on':''}">${x}</a>`).join('')}<div class="r">View site <i>Log out</i></div></div>`;
const tile = (t, extra='') => `<div class="tile ${extra}">${t.beta?'<span class="beta">BETA</span>':''}<span class="bulb">💡</span>${logo(t)}<h3>${t.name}</h3><span class="hint">${extra.includes('hover')?'View details →':'Tap for details'}</span></div>`;
