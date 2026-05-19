// theme.jsx — Life Coach design tokens + theme system + icons.
//
// Exports: useTheme(dark, accent) returns the full token object.

function makeTheme(dark, accent) {
  if (dark) {
    return {
      accent,
      accentSoft: accent + '26',          // 15% alpha
      accentSofter: accent + '14',        // 8%
      bg: '#0A0A0C',                       // page background
      bg2: '#131316',                      // raised surface (cards)
      bg3: '#1C1C20',                      // sunken/secondary surface
      hairline: 'rgba(255,255,255,0.08)',
      hairlineStrong: 'rgba(255,255,255,0.14)',
      text: '#F5F5F7',
      textDim: 'rgba(235,235,245,0.62)',
      textFaint: 'rgba(235,235,245,0.36)',
      ok: '#34c759',
      amber: '#ffb340',
      red: '#ff453a',
      tabBar: 'rgba(20,20,22,0.78)',
      tabBarBorder: 'rgba(255,255,255,0.08)',
      shadow: '0 12px 32px rgba(0,0,0,0.35)',
      dark: true,
    };
  }
  return {
    accent,
    accentSoft: accent + '1F',
    accentSofter: accent + '12',
    bg: '#F6F6F4',
    bg2: '#FFFFFF',
    bg3: '#EFEEEA',
    hairline: 'rgba(60,60,67,0.10)',
    hairlineStrong: 'rgba(60,60,67,0.18)',
    text: '#0A0A0C',
    textDim: 'rgba(60,60,67,0.62)',
    textFaint: 'rgba(60,60,67,0.36)',
    ok: '#2a8a4a',
    amber: '#c47900',
    red: '#d23030',
    tabBar: 'rgba(246,246,244,0.82)',
    tabBarBorder: 'rgba(60,60,67,0.12)',
    shadow: '0 10px 30px rgba(0,0,0,0.07)',
    dark: false,
  };
}

// Score color helper — green ≥7, amber 4–6, red <4
function scoreColor(score, theme) {
  if (score >= 7) return theme.ok;
  if (score >= 4) return theme.amber;
  return theme.red;
}

// ── Icons (24px line, currentColor) ─────────────────────────────────────────
const Icon = ({ d, size = 24, stroke = 1.75, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);

const Icons = {
  home: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></Icon>,
  target: (p) => <Icon size={p?.size} stroke={p?.stroke}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></Icon>,
  waves: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/></Icon>,
  person: (p) => <Icon size={p?.size} stroke={p?.stroke}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></Icon>,
  mic: (p) => <Icon size={p?.size} stroke={p?.stroke}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/></Icon>,
  check: (p) => <Icon size={p?.size} stroke={p?.stroke || 2.2}><path d="M4 12l5 5L20 6"/></Icon>,
  chevR: (p) => <Icon size={p?.size || 18} stroke={p?.stroke || 2}><path d="M9 6l6 6-6 6"/></Icon>,
  chevL: (p) => <Icon size={p?.size || 18} stroke={p?.stroke || 2}><path d="M15 6l-9 6 9 6"/></Icon>,
  chevD: (p) => <Icon size={p?.size || 18} stroke={p?.stroke || 2}><path d="M6 9l6 6 6-6"/></Icon>,
  plus: (p) => <Icon size={p?.size} stroke={p?.stroke || 2}><path d="M12 5v14M5 12h14"/></Icon>,
  x: (p) => <Icon size={p?.size} stroke={p?.stroke || 2}><path d="M6 6l12 12M18 6L6 18"/></Icon>,
  lock: (p) => <Icon size={p?.size} stroke={p?.stroke}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></Icon>,
  shield: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></Icon>,
  sparkle: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></Icon>,
  edit: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></Icon>,
  bell: (p) => <Icon size={p?.size} stroke={p?.stroke}><path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/></Icon>,
  apple: (p) => <Icon size={p?.size} stroke="none" fill="currentColor"><path d="M16.5 12.5c0-2.6 2.1-3.9 2.2-3.9-1.2-1.7-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.7-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-3.7zM14 4.5c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.5-.7.8-1.3 2-1.1 3.2 1.1.1 2.2-.5 3-1.4z"/></Icon>,
  google: () => (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.83h5.4a4.62 4.62 0 01-2 3.03v2.51h3.24c1.9-1.75 2.96-4.33 2.96-7.35z"/>
      <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.42l-3.24-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H1.05v2.59A10 10 0 0010 20z"/>
      <path fill="#FBBC05" d="M4.4 11.9a6 6 0 010-3.8V5.5H1.05a10 10 0 000 9z"/>
      <path fill="#EA4335" d="M10 3.96a5.43 5.43 0 013.84 1.5l2.87-2.87A10 10 0 001.05 5.5L4.4 8.1c.79-2.37 3-4.14 5.6-4.14z"/>
    </svg>
  ),
};

Object.assign(window, { makeTheme, scoreColor, Icon, Icons });
