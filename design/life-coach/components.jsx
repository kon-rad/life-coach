// components.jsx — shared UI primitives for Life Coach.

// Primary button — pill, accent fill
function PrimaryButton({ children, onClick, theme, icon, full = true, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      appearance: 'none', border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto',
      height: 54, padding: '0 22px', borderRadius: 16,
      background: theme.accent, color: '#fff',
      fontFamily: 'inherit', fontSize: 17, fontWeight: 600, letterSpacing: -0.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.45 : 1,
      boxShadow: theme.dark ? '0 8px 24px ' + theme.accent + '55' : '0 8px 24px ' + theme.accent + '40',
    }}>
      {icon}{children}
    </button>
  );
}

function SecondaryButton({ children, onClick, theme, icon, full = true }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer',
      border: '0.5px solid ' + theme.hairlineStrong,
      width: full ? '100%' : 'auto',
      height: 54, padding: '0 22px', borderRadius: 16,
      background: theme.bg2, color: theme.text,
      fontFamily: 'inherit', fontSize: 17, fontWeight: 500, letterSpacing: -0.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {icon}{children}
    </button>
  );
}

function GhostButton({ children, onClick, theme }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', border: 0, background: 'transparent',
      color: theme.accent, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 15, fontWeight: 500, padding: '6px 8px',
    }}>{children}</button>
  );
}

// Card — generic raised surface
function Card({ children, theme, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: theme.bg2, borderRadius: 22,
      border: '0.5px solid ' + theme.hairline,
      padding: 20,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Checkbox row — for micro-actions
function CheckRow({ label, hint, checked, onToggle, theme, last }) {
  return (
    <div onClick={onToggle} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '16px 4px',
      borderBottom: last ? 'none' : '0.5px solid ' + theme.hairline,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 12, marginTop: 1,
        border: '1.5px solid ' + (checked ? theme.accent : theme.hairlineStrong),
        background: checked ? theme.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.18s',
      }}>
        {checked && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15.5, fontWeight: 500, color: theme.text,
          textDecoration: checked ? 'line-through' : 'none',
          opacity: checked ? 0.5 : 1, lineHeight: 1.35, letterSpacing: -0.2,
        }}>{label}</div>
        {hint && <div style={{
          fontSize: 13, color: theme.textDim, marginTop: 3, letterSpacing: -0.1,
          opacity: checked ? 0.5 : 1,
        }}>{hint}</div>}
      </div>
    </div>
  );
}

// Section header (small uppercase) — for grouped lists
function SectionLabel({ children, theme, style }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: 0.6,
      textTransform: 'uppercase', color: theme.textFaint,
      padding: '0 4px 10px',
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, { PrimaryButton, SecondaryButton, GhostButton, Card, CheckRow, SectionLabel });
