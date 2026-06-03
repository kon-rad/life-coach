import { ACCENT } from '@/lib/theme';
import { Tag, Container } from './UI';
import { PhoneMock, MockCall } from './PhoneMock';

const steps = [
  {
    num: '01', title: 'Weekly planning call', time: 'Once a week · 5 min',
    body: 'Open the week with a planning call and set your 3 goals for the week. Everything else ladders up to these.',
    icon: 'mic',
  },
  {
    num: '02', title: 'Midday check-in', time: 'Daily · 3 min',
    body: 'Say what you got done, what’s next, and any blockers. Your coach turns it into a checklist of 3 tasks for today — all aligned to the week.',
    icon: 'mic',
  },
  {
    num: '03', title: 'Evening debrief', time: 'Daily · 5 min',
    body: 'Report what you finished, check off your tasks, and plan tomorrow. Each day closes with a 0–10 score.',
    icon: 'check',
  },
  {
    num: '04', title: 'Weekly retrospective', time: 'End of week',
    body: 'A retro call reviews how the week went — what worked, what to improve — then rolls straight into planning next week’s 3 goals.',
    icon: 'score',
  },
];

function StepIcon({ kind }: { kind: string }) {
  if (kind === 'mic') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3"/>
      <path d="M5 11a7 7 0 0014 0"/>
      <path d="M12 18v3"/>
    </svg>
  );
  if (kind === 'check') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>
    </svg>
  );
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/>
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" style={{ padding: '120px 0 100px', position: 'relative' }}>
      <Container>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <Tag>The system</Tag>
          <h2 className="section-h2" style={{
            fontSize: 56, fontWeight: 600, lineHeight: 1.05,
            letterSpacing: -1.8, margin: '20px 0 14px',
            color: '#F5F5F7',
          }}>Your week, run like a sprint.</h2>
          <p style={{
            fontSize: 18, lineHeight: 1.5, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.6)', margin: '0 auto',
            maxWidth: 560,
          }}>
            A weekly planning call sets your 3 goals for the week. Each day, your coach builds a 3-task checklist from your check-ins and scores how it went. A weekly retrospective closes the loop and plans the next.
          </p>
        </div>

        {/* Step cards */}
        <div className="steps-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20,
          marginBottom: 80,
        }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 24, padding: '32px 28px',
              display: 'flex', flexDirection: 'column', gap: 16,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: ACCENT + '14', color: ACCENT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StepIcon kind={s.icon}/>
                </div>
                <div style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14, color: 'rgba(245,245,247,0.3)',
                  letterSpacing: 0.5, fontWeight: 500,
                }}>{s.num}</div>
              </div>
              <div>
                <h3 style={{
                  fontSize: 21, fontWeight: 600, letterSpacing: -0.5, margin: 0,
                  color: '#F5F5F7',
                }}>{s.title}</h3>
                <div style={{
                  fontSize: 12, color: 'rgba(245,245,247,0.4)', letterSpacing: 0.4,
                  textTransform: 'uppercase', fontWeight: 500, marginTop: 6, marginBottom: 10,
                }}>{s.time}</div>
                <p style={{
                  margin: 0, fontSize: 15, lineHeight: 1.55, letterSpacing: -0.2,
                  color: 'rgba(245,245,247,0.6)',
                }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Hero moment: Talk it out */}
        <div className="howit-split" style={{
          display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 60,
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.025), rgba(255,255,255,0.005))',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 32, padding: '56px 56px', position: 'relative', overflow: 'hidden',
        }}>
          <div>
            <Tag>The hero moment</Tag>
            <h3 className="section-h3" style={{
              fontSize: 40, fontWeight: 600, lineHeight: 1.05,
              letterSpacing: -1.2, margin: '20px 0 16px',
              color: '#F5F5F7',
            }}>Talk it out, hands-free.</h3>
            <p style={{
              fontSize: 17, lineHeight: 1.55, letterSpacing: -0.2,
              color: 'rgba(245,245,247,0.65)', margin: '0 0 12px',
              maxWidth: 460,
            }}>
              Voice calls are the heart of Soularc. A weekly planning call to set your goals, a midday check-in to stay on track, an evening debrief to close the day, and a retrospective to wrap the week. No typing, no friction.
            </p>
            <p style={{
              fontSize: 14, lineHeight: 1.55, letterSpacing: -0.1,
              color: 'rgba(245,245,247,0.4)', margin: 0,
            }}>
              Prefer text? Switch to chat anytime.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PhoneMock scale={0.66}>
              <MockCall listening={true}/>
            </PhoneMock>
          </div>
        </div>
      </Container>
    </section>
  );
}
