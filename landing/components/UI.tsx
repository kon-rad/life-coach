import React from 'react';
import { ACCENT } from '@/lib/theme';

export function Wordmark({ size = 22, color = '#F5F5F7' }: { size?: number; color?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color }}>
      <div style={{
        width: size * 1.36, height: size * 1.36, borderRadius: size * 0.4,
        background: ACCENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/>
        </svg>
      </div>
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: -0.5 }}>Soularc</span>
    </div>
  );
}

export function AppStoreBadge({ size = 1 }: { size?: number }) {
  const w = 180 * size, h = 56 * size;
  return (
    <a href="#" style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      height: h, padding: '0 18px', width: w, boxSizing: 'border-box',
      background: '#000', color: '#fff', whiteSpace: 'nowrap',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)',
      textDecoration: 'none',
      fontFamily: 'var(--font-geist-sans), -apple-system, system-ui',
      flexShrink: 0,
    }}>
      <svg width={28 * size} height={34 * size} viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0 }}>
        <path d="M16.5 12.5c0-2.6 2.1-3.9 2.2-3.9-1.2-1.7-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.7-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-3.7zM14 4.5c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.5-.7.8-1.3 2-1.1 3.2 1.1.1 2.2-.5 3-1.4z"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11 * size, opacity: 0.85, letterSpacing: 0.2 }}>Download on the</span>
        <span style={{ fontSize: 21 * size, fontWeight: 500, letterSpacing: -0.3, marginTop: 4 }}>App Store</span>
      </div>
    </a>
  );
}

export function Tag({ children, color = ACCENT }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8,
      textTransform: 'uppercase',
      color, whiteSpace: 'nowrap',
      background: color + '14', border: '0.5px solid ' + color + '30',
      padding: '6px 12px', borderRadius: 999,
    }}>{children}</div>
  );
}

export function Container({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: '100%', maxWidth: 1280, margin: '0 auto',
      padding: '0 32px', boxSizing: 'border-box',
      ...style,
    }}>{children}</div>
  );
}
