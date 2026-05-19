export const ACCENT = '#4f5dff';

export const theme = {
  accent: ACCENT,
  accentSoft: ACCENT + '26',
  accentSofter: ACCENT + '14',
  bg: '#0A0A0C',
  bg2: '#131316',
  bg3: '#1C1C20',
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

export function scoreColor(score: number): string {
  if (score >= 7) return theme.ok;
  if (score >= 4) return theme.amber;
  return theme.red;
}
