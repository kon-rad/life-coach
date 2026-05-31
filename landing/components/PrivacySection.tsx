import { ACCENT } from '@/lib/theme';
import { Tag, Container } from './UI';

const bullets = [
  {
    t: 'Anonymous to the AI',
    d: "The coach never sees your name, email, or anything that identifies you. We don't ask.",
  },
  {
    t: 'Encrypted at rest and in transit',
    d: "Your goals, conversations, and reflections are stored as ciphertext. Your key never touches our servers.",
  },
  {
    t: 'Never used for training',
    d: "Your data is yours. We don't sell it, share it, or feed it to AI models. Wipe it any time.",
  },
];

export default function PrivacySection() {
  return (
    <section id="privacy" style={{ padding: '60px 0 120px', position: 'relative' }}>
      <Container>
        <div style={{
          background: '#0E0E12',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 32, padding: '72px 64px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: -120, right: -80, width: 480, height: 480, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`,
            pointerEvents: 'none',
          }}/>

          <div className="privacy-grid" style={{
            position: 'relative',
            display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80,
            alignItems: 'flex-start',
          }}>
            {/* Left */}
            <div>
              <Tag color="#F5F5F7">A trust certificate</Tag>
              <h2 className="section-h2" style={{
                fontSize: 52, fontWeight: 600, lineHeight: 1.05,
                letterSpacing: -1.6, margin: '20px 0 16px',
                color: '#F5F5F7',
              }}>
                We can&apos;t read<br/>your data.<br/>
                <span style={{ color: 'rgba(245,245,247,0.45)' }}>By design.</span>
              </h2>
              <p style={{
                fontSize: 16, lineHeight: 1.55, letterSpacing: -0.2,
                color: 'rgba(245,245,247,0.6)', margin: 0,
                maxWidth: 380,
              }}>
                The deepest conversations need the strongest privacy. Here&apos;s exactly how we protect yours.
              </p>
            </div>

            {/* Right: bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  padding: '24px 0',
                  borderBottom: i < bullets.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: ACCENT + '14', color: ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l5 5L20 6"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: 19, fontWeight: 600, letterSpacing: -0.4,
                      color: '#F5F5F7', marginBottom: 6,
                    }}>{b.t}</div>
                    <p style={{
                      margin: 0, fontSize: 14.5, lineHeight: 1.55, letterSpacing: -0.1,
                      color: 'rgba(245,245,247,0.55)',
                    }}>{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
