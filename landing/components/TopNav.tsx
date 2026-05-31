import { Wordmark } from './UI';

export default function TopNav() {
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
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="#how" style={{
              color: 'rgba(245,245,247,0.7)', textDecoration: 'none',
              fontSize: 14, fontWeight: 500, letterSpacing: -0.1, whiteSpace: 'nowrap',
            }}>How it works</a>
            <a href="#privacy" style={{
              color: 'rgba(245,245,247,0.7)', textDecoration: 'none',
              fontSize: 14, fontWeight: 500, letterSpacing: -0.1, whiteSpace: 'nowrap',
            }}>Privacy</a>
          </div>
          <a href="#waitlist" style={{
            background: '#fff', color: '#0A0A0C',
            padding: '8px 16px', borderRadius: 999,
            textDecoration: 'none', fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
            whiteSpace: 'nowrap',
          }}>Join waitlist</a>
        </div>
      </div>
    </nav>
  );
}
