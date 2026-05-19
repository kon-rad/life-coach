// landing.jsx — Life Coach marketing landing page.

const ACCENT = '#4f5dff';

// ── Scaled phone mock — wraps the existing IOSDevice via transform: scale ──
function PhoneMock({ children, scale = 0.62, theme, frameDark = true, label }) {
  // IOSDevice is 402×874. We render full-size then scale visually.
  return (
    <div style={{
      width: 402 * scale, height: 874 * scale,
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        transform: `scale(${scale})`, transformOrigin: 'top left',
        width: 402, height: 874,
      }}>
        <IOSDevice dark={frameDark}>
          {children}
        </IOSDevice>
      </div>
    </div>
  );
}

// ── Wordmark ────────────────────────────────────────────────────────────────
function Wordmark({ size = 22, color = '#F5F5F7' }) {
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
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: -0.5 }}>Life Coach</span>
    </div>
  );
}

// ── App Store badge — recreated cleanly ─────────────────────────────────────
function AppStoreBadge({ size = 1, onClick }) {
  const w = 180 * size, h = 56 * size;
  return (
    <a href="#" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      height: h, padding: '0 18px', width: w, boxSizing: 'border-box',
      background: '#000', color: '#fff', whiteSpace: 'nowrap',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)',
      textDecoration: 'none', fontFamily: '-apple-system, "SF Pro", system-ui',
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

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ children, style }) {
  return (
    <section style={{
      width: '100%', maxWidth: 1280, margin: '0 auto',
      padding: '0 32px', boxSizing: 'border-box',
      ...style,
    }}>{children}</section>
  );
}

// ── Tag chip (small uppercase pill) ─────────────────────────────────────────
function Tag({ children, color = ACCENT }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
      color: color, whiteSpace: 'nowrap',
      background: color + '14', border: '0.5px solid ' + color + '30',
      padding: '6px 12px', borderRadius: 999,
    }}>{children}</div>
  );
}

// ── Top navigation ──────────────────────────────────────────────────────────
function TopNav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      background: 'rgba(10,10,12,0.6)',
      borderBottom: '0.5px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Wordmark size={20}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#how" style={{ color: 'rgba(245,245,247,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500, letterSpacing: -0.1, whiteSpace: 'nowrap' }}>How it works</a>
          <a href="#privacy" style={{ color: 'rgba(245,245,247,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500, letterSpacing: -0.1, whiteSpace: 'nowrap' }}>Privacy</a>
          <a href="#download" style={{
            background: '#fff', color: '#0A0A0C',
            padding: '8px 16px', borderRadius: 999,
            textDecoration: 'none', fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
          }}>Download</a>
        </div>
      </div>
    </nav>
  );
}

Object.assign(window, { ACCENT, PhoneMock, Wordmark, AppStoreBadge, Section, Tag, TopNav });
