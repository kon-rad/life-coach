import { Wordmark, Container } from './UI';

const links = ['Privacy', 'Terms', 'Support', 'Press'];

export default function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid rgba(255,255,255,0.06)',
      padding: '40px 0 60px',
    }}>
      <Container style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20,
      }}>
        <Wordmark size={18}/>
        <div style={{ display: 'flex', gap: 28 }}>
          {links.map((l) => (
            <a key={l} href="#" style={{
              fontSize: 13, color: 'rgba(245,245,247,0.5)',
              textDecoration: 'none', letterSpacing: -0.1,
            }}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', letterSpacing: -0.1, whiteSpace: 'nowrap' }}>
          © 2026 Soularc Inc.
        </div>
      </Container>
    </footer>
  );
}
