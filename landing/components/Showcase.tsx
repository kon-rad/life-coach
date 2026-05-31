import { ACCENT } from '@/lib/theme';
import { Tag, Container } from './UI';
import { PhoneMock, MockHome, MockCall, MockProject, MockConversations } from './PhoneMock';

const items = [
  { label: 'Today',         caption: 'Your score tells you exactly how the day went.' },
  { label: 'Voice call',    caption: 'Talk through your day. The coach listens, then responds.' },
  { label: 'Tasks',         caption: 'Weekly and daily tasks in one place. Check them off as you go.' },
  { label: 'Conversations', caption: 'Every call and chat, all in one place.' },
];

function MockForIndex({ index }: { index: number }) {
  if (index === 0) return <MockHome/>;
  if (index === 1) return <MockCall listening={true}/>;
  if (index === 2) return <MockProject/>;
  return <MockConversations/>;
}

export default function Showcase() {
  return (
    <section style={{ padding: '40px 0 120px', position: 'relative' }}>
      <Container>
        <div style={{ marginBottom: 64, maxWidth: 720 }}>
          <Tag>Inside the app</Tag>
          <h2 className="section-h2" style={{
            fontSize: 52, fontWeight: 600, lineHeight: 1.05,
            letterSpacing: -1.6, margin: '20px 0 14px',
            color: '#F5F5F7',
          }}>
            Four screens.{' '}
            <span style={{ color: 'rgba(245,245,247,0.45)' }}>No noise.</span>
          </h2>
          <p style={{
            fontSize: 17, lineHeight: 1.5, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.6)', margin: 0,
            maxWidth: 520,
          }}>
            Everything in Life Coach is there because it earns its place. Nothing else.
          </p>
        </div>

        <div className="showcase-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
        }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <PhoneMock scale={0.48}>
                <MockForIndex index={i}/>
              </PhoneMock>
              <div style={{ textAlign: 'center', maxWidth: 220 }}>
                <div style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 11, color: ACCENT, letterSpacing: 1,
                  textTransform: 'uppercase', marginBottom: 8, fontWeight: 500,
                }}>{it.label}</div>
                <p style={{
                  margin: 0, fontSize: 15.5, lineHeight: 1.4, letterSpacing: -0.2,
                  color: 'rgba(245,245,247,0.85)',
                }}>{it.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
