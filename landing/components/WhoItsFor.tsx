import { Tag, Container } from './UI';

const targets = [
  'Career change',
  'Starting a business',
  'Half marathon',
  'Writing a book',
  'Learning a language',
  'Sleeping before 11pm',
];

export default function WhoItsFor() {
  return (
    <section style={{ padding: '60px 0 120px', position: 'relative' }}>
      <Container style={{ maxWidth: 920 }}>
        <div style={{ textAlign: 'center' }}>
          <Tag>Who it&apos;s for</Tag>
          <h2 className="section-h2" style={{
            fontSize: 48, fontWeight: 600, lineHeight: 1.1,
            letterSpacing: -1.4, margin: '20px 0 24px',
            color: '#F5F5F7',
          }}>
            For people who run their week{' '}
            <span style={{ color: 'rgba(245,245,247,0.45)' }}>with intention.</span>
          </h2>
          <p style={{
            fontSize: 18, lineHeight: 1.55, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.65)', margin: '0 auto 40px',
            maxWidth: 600,
          }}>
            Soularc works when you show up for a weekly planning call, two short daily standups, and the discipline to work your 3 tasks. Week after week.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {targets.map((t) => (
              <div key={t} style={{
                fontSize: 14, color: 'rgba(245,245,247,0.8)',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                padding: '10px 18px', borderRadius: 999, letterSpacing: -0.1,
                whiteSpace: 'nowrap',
              }}>{t}</div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
