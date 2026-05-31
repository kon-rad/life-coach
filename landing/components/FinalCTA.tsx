import { ACCENT } from '@/lib/theme';
import { Container } from './UI';
import WaitlistForm from './WaitlistForm';

export default function FinalCTA() {
  return (
    <section id="waitlist" style={{ position: 'relative', padding: '80px 0 60px', overflow: 'hidden' }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 900px 500px at 50% 50%, ${ACCENT}24, transparent 60%)`,
      }}/>
      <Container style={{ position: 'relative', textAlign: 'center', maxWidth: 640 }}>
        <h2 className="cta-h2" style={{
          fontSize: 64, fontWeight: 600, lineHeight: 1.02,
          letterSpacing: -2, margin: '0 0 18px',
          color: '#F5F5F7',
        }}>
          Be first to<br/>find your arc.
        </h2>
        <p style={{
          fontSize: 18, lineHeight: 1.5, letterSpacing: -0.2,
          color: 'rgba(245,245,247,0.65)', margin: '0 0 36px',
        }}>
          Soularc launches on iOS soon. Join the waitlist and we&apos;ll let you know when it&apos;s ready.
        </p>
        <WaitlistForm/>
      </Container>
    </section>
  );
}
