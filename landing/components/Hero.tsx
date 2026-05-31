import { ACCENT } from '@/lib/theme';
import { Tag, Container } from './UI';
import WaitlistForm from './WaitlistForm';
import { PhoneMock, MockHome } from './PhoneMock';

export default function Hero() {
  return (
    <section style={{
      position: 'relative', width: '100%',
      paddingTop: 120, paddingBottom: 80, overflow: 'hidden',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 1100px 700px at 70% 35%, ${ACCENT}1F, transparent 60%),
                     radial-gradient(ellipse 800px 500px at 20% 90%, ${ACCENT}10, transparent 60%)`,
      }}/>

      <Container style={{ position: 'relative' }}>
        <div className="hero-grid" style={{
          display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 64,
          alignItems: 'center', minHeight: 540,
        }}>
          {/* Left: copy */}
          <div>
            <Tag>Now in beta · iOS</Tag>
            <h1 className="hero-h1" style={{
              fontSize: 64, fontWeight: 600, lineHeight: 1.04,
              letterSpacing: -1.8, margin: '24px 0 28px',
              color: '#F5F5F7',
            }}>
              <span style={{ display: 'block' }}>Plan the week.</span>
              <span style={{ display: 'block' }}>Win the day.</span>
              <span style={{ display: 'block', color: 'rgba(245,245,247,0.45)' }}>Every week.</span>
            </h1>
            <p style={{
              fontSize: 19, lineHeight: 1.5, letterSpacing: -0.3,
              color: 'rgba(245,245,247,0.65)', margin: '0 0 36px',
              maxWidth: 520,
            }}>
              A weekly planning + retrospective call sets your 3 goals for the week. Two short daily standups — a midday check-in and an evening debrief — keep you on track day by day.{' '}
              <span style={{ color: '#F5F5F7' }}>Private by design.</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <WaitlistForm/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(245,245,247,0.6)', flexShrink: 0 }}>
                  <rect x="5" y="11" width="14" height="9" rx="2"/>
                  <path d="M8 11V8a4 4 0 018 0v3"/>
                </svg>
                <span style={{ fontSize: 13.5, color: 'rgba(245,245,247,0.6)', letterSpacing: -0.1 }}>
                  End-to-end encrypted. We can&apos;t read your data.
                </span>
              </div>
            </div>
          </div>

          {/* Right: phone mock */}
          <div className="hero-phone" style={{
            position: 'relative',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            {/* Ambient glow */}
            <div style={{
              position: 'absolute', width: 480, height: 480, borderRadius: '50%',
              background: `radial-gradient(circle, ${ACCENT}28, transparent 70%)`,
              filter: 'blur(20px)',
            }}/>
            <div style={{ position: 'relative' }}>
              <PhoneMock scale={0.68}>
                <MockHome/>
              </PhoneMock>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
