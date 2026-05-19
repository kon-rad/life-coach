// landing-sections.jsx — Marketing page sections.

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero({ theme }) {
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

      <Section style={{
        position: 'relative',
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 64,
        alignItems: 'center', minHeight: 540,
      }} data-stack-on-mobile>
        <div>
          <Tag>Now in beta · iOS</Tag>
          <h1 style={{
            fontSize: 64, fontWeight: 600, lineHeight: 1.04,
            letterSpacing: -1.8, margin: '24px 0 28px',
            color: '#F5F5F7',
          }}>
            <span style={{ display: 'block' }}>One goal. Two calls.</span>
            <span style={{ display: 'block' }}>Three actions.</span>
            <span style={{ display: 'block', color: 'rgba(245,245,247,0.45)' }}>Every day.</span>
          </h1>
          <p style={{
            fontSize: 19, lineHeight: 1.5, letterSpacing: -0.3,
            color: 'rgba(245,245,247,0.65)', margin: '0 0 36px',
            maxWidth: 520, textWrap: 'pretty',
          }}>
            A daily voice check-in with an AI coach. Three specific actions to complete. A score at the end of the day. <span style={{ color: '#F5F5F7' }}>Private by design.</span>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <AppStoreBadge/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.lock size={14} stroke={2}/>
              <span style={{ fontSize: 13.5, color: 'rgba(245,245,247,0.6)', letterSpacing: -0.1 }}>
                End-to-end encrypted. We can't read your data.
              </span>
            </div>
          </div>
        </div>

        {/* Phone mock with ambient glow */}
        <div style={{
          position: 'relative',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute', width: 480, height: 480, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}28, transparent 70%)`,
            filter: 'blur(20px)',
          }}/>
          <div style={{ position: 'relative' }}>
            <PhoneMock scale={0.68}>
              <MockHome theme={theme}/>
            </PhoneMock>
          </div>
        </div>
      </Section>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
function HowItWorks({ theme }) {
  const steps = [
    { num: '01', title: 'Morning check-in', time: '5 min',
      body: "Your AI coach reviews your goal, asks how you're doing, and sets your three micro-actions for the day.",
      icon: 'mic' },
    { num: '02', title: 'Three micro-actions', time: 'Through the day',
      body: 'Small, specific, completable. Not a to-do list — a daily contract with yourself.',
      icon: 'check' },
    { num: '03', title: 'Evening reflection', time: '5 min',
      body: 'Report back. Reflect on what happened. Get scored 0–10. Plan tomorrow.',
      icon: 'score' },
  ];

  const StepIcon = ({ kind }) => {
    if (kind === 'mic') return <Icons.mic size={28} stroke={1.5}/>;
    if (kind === 'check') return <Icons.target size={28} stroke={1.5}/>;
    return <Icons.waves size={28} stroke={1.5}/>;
  };

  return (
    <section id="how" style={{ padding: '120px 0 100px', position: 'relative' }}>
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <Tag>The loop</Tag>
          <h2 style={{
            fontSize: 56, fontWeight: 600, lineHeight: 1.05,
            letterSpacing: -1.8, margin: '20px 0 14px',
            color: '#F5F5F7', textWrap: 'balance',
          }}>Your daily routine, simplified.</h2>
          <p style={{
            fontSize: 18, lineHeight: 1.5, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.6)', margin: '0 auto',
            maxWidth: 560, textWrap: 'pretty',
          }}>
            One goal at a time. Two short calls a day. Three actions in between. That's the whole app.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          marginBottom: 80,
        }} data-steps-grid>
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
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
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
                  color: 'rgba(245,245,247,0.6)', textWrap: 'pretty',
                }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Inline call mock */}
        <div style={{
          display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 60,
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.025), rgba(255,255,255,0.005))',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 32, padding: '56px 56px', position: 'relative', overflow: 'hidden',
        }} data-stack-on-mobile>
          <div>
            <Tag>The hero moment</Tag>
            <h3 style={{
              fontSize: 40, fontWeight: 600, lineHeight: 1.05,
              letterSpacing: -1.2, margin: '20px 0 16px',
              color: '#F5F5F7', textWrap: 'balance',
            }}>Talk it out, hands-free.</h3>
            <p style={{
              fontSize: 17, lineHeight: 1.55, letterSpacing: -0.2,
              color: 'rgba(245,245,247,0.65)', margin: '0 0 12px',
              maxWidth: 460, textWrap: 'pretty',
            }}>
              Voice calls are the heart of Life Coach. Five minutes in the morning to set the day. Five minutes at night to close it out. No typing, no friction.
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
              <MockCall theme={theme} listening={true}/>
            </PhoneMock>
          </div>
        </div>
      </Section>
    </section>
  );
}

// ── Privacy ─────────────────────────────────────────────────────────────────
function PrivacySection() {
  const bullets = [
    { t: 'Anonymous to the AI',
      d: 'The coach never sees your name, email, or anything that identifies you. We don\'t ask.' },
    { t: 'Encrypted at rest and in transit',
      d: 'Your goals, conversations, and reflections are stored as ciphertext. Your key never touches our servers.' },
    { t: 'Never used for training',
      d: 'Your data is yours. We don\'t sell it, share it, or feed it to AI models. Wipe it any time.' },
  ];

  return (
    <section id="privacy" style={{ padding: '60px 0 120px', position: 'relative' }}>
      <Section>
        <div style={{
          background: '#0E0E12',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 32, padding: '72px 64px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -120, right: -80, width: 480, height: 480, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`,
          }}/>

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'flex-start' }} data-stack-on-mobile>
            <div>
              <Tag color="#F5F5F7">A trust certificate</Tag>
              <h2 style={{
                fontSize: 52, fontWeight: 600, lineHeight: 1.05,
                letterSpacing: -1.6, margin: '20px 0 16px',
                color: '#F5F5F7', textWrap: 'balance',
              }}>
                We can't read<br/>your data.<br/>
                <span style={{ color: 'rgba(245,245,247,0.45)' }}>By design.</span>
              </h2>
              <p style={{
                fontSize: 16, lineHeight: 1.55, letterSpacing: -0.2,
                color: 'rgba(245,245,247,0.6)', margin: 0,
                maxWidth: 380, textWrap: 'pretty',
              }}>
                The deepest conversations need the strongest privacy. Here's exactly how we protect yours.
              </p>
            </div>

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
                    <Icons.check size={20} stroke={2.4}/>
                  </div>
                  <div>
                    <div style={{
                      fontSize: 19, fontWeight: 600, letterSpacing: -0.4,
                      color: '#F5F5F7', marginBottom: 6,
                    }}>{b.t}</div>
                    <p style={{
                      margin: 0, fontSize: 14.5, lineHeight: 1.55, letterSpacing: -0.1,
                      color: 'rgba(245,245,247,0.55)', textWrap: 'pretty',
                    }}>{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </section>
  );
}

// ── Feature showcase ────────────────────────────────────────────────────────
function Showcase({ theme }) {
  const items = [
    { mock: <MockHome theme={theme}/>, label: 'Today',
      caption: 'Your score tells you exactly how the day went.' },
    { mock: <MockCall theme={theme} listening={true}/>, label: 'Voice call',
      caption: 'Talk through your day. The coach listens, then responds.' },
    { mock: <MockProject theme={theme}/>, label: 'Project',
      caption: 'One goal at a time. Every day, scored.' },
    { mock: <MockChat theme={theme}/>, label: 'Chat',
      caption: 'Type instead, when talking isn\'t an option.' },
  ];
  return (
    <section style={{ padding: '40px 0 120px', position: 'relative' }}>
      <Section>
        <div style={{ marginBottom: 64, maxWidth: 720 }}>
          <Tag>Inside the app</Tag>
          <h2 style={{
            fontSize: 52, fontWeight: 600, lineHeight: 1.05,
            letterSpacing: -1.6, margin: '20px 0 14px',
            color: '#F5F5F7', textWrap: 'balance',
          }}>
            Four screens. <span style={{ color: 'rgba(245,245,247,0.45)' }}>No noise.</span>
          </h2>
          <p style={{
            fontSize: 17, lineHeight: 1.5, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.6)', margin: 0,
            maxWidth: 520, textWrap: 'pretty',
          }}>
            Everything in Life Coach is there because it earns its place. Nothing else.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} data-showcase-grid>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <PhoneMock scale={0.48}>{it.mock}</PhoneMock>
              <div style={{ textAlign: 'center', maxWidth: 220 }}>
                <div style={{
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                  fontSize: 11, color: ACCENT, letterSpacing: 1, textTransform: 'uppercase',
                  marginBottom: 8, fontWeight: 500,
                }}>{it.label}</div>
                <p style={{
                  margin: 0, fontSize: 15.5, lineHeight: 1.4, letterSpacing: -0.2,
                  color: 'rgba(245,245,247,0.85)', textWrap: 'pretty',
                }}>{it.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </section>
  );
}

// ── Who it's for ────────────────────────────────────────────────────────────
function WhoItsFor() {
  const targets = [
    'Career change',
    'Starting a business',
    'Half marathon',
    'Writing a book',
    'Learning a language',
    'Sleeping before 11pm',
  ];
  return (
    <section style={{ padding: '60px 0 120px', position: 'relative' }}>
      <Section style={{ maxWidth: 920 }}>
        <div style={{ textAlign: 'center' }}>
          <Tag>Who it's for</Tag>
          <h2 style={{
            fontSize: 48, fontWeight: 600, lineHeight: 1.1,
            letterSpacing: -1.4, margin: '20px 0 24px',
            color: '#F5F5F7', textWrap: 'balance',
          }}>
            For people serious about <span style={{ color: 'rgba(245,245,247,0.45)' }}>one</span> goal.<br/>
            Not five.
          </h2>
          <p style={{
            fontSize: 18, lineHeight: 1.55, letterSpacing: -0.2,
            color: 'rgba(245,245,247,0.65)', margin: '0 auto 40px',
            maxWidth: 600, textWrap: 'pretty',
          }}>
            Life Coach works when you bring something specific you actually want to make progress on. Daily. For weeks. Until it's done.
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
      </Section>
    </section>
  );
}

// ── Final CTA + footer ──────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section id="download" style={{ position: 'relative', padding: '80px 0 60px', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 900px 500px at 50% 50%, ${ACCENT}24, transparent 60%)`,
      }}/>
      <Section style={{ position: 'relative', textAlign: 'center', maxWidth: 760 }}>
        <h2 style={{
          fontSize: 64, fontWeight: 600, lineHeight: 1.02,
          letterSpacing: -2, margin: '0 0 18px',
          color: '#F5F5F7', textWrap: 'balance',
        }}>
          Start your<br/>first goal today.
        </h2>
        <p style={{
          fontSize: 18, lineHeight: 1.5, letterSpacing: -0.2,
          color: 'rgba(245,245,247,0.65)', margin: '0 0 36px',
        }}>
          Available on iOS. Free to start. No credit card.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AppStoreBadge size={1.2}/>
        </div>
      </Section>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid rgba(255,255,255,0.06)',
      padding: '40px 0 60px',
    }}>
      <Section style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20,
      }}>
        <Wordmark size={18}/>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Privacy', 'Terms', 'Support', 'Press'].map((l) => (
            <a key={l} href="#" style={{
              fontSize: 13, color: 'rgba(245,245,247,0.5)', textDecoration: 'none',
              letterSpacing: -0.1,
            }}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', letterSpacing: -0.1, whiteSpace: 'nowrap' }}>
          © 2026 Life Coach Inc.
        </div>
      </Section>
    </footer>
  );
}

Object.assign(window, { Hero, HowItWorks, PrivacySection, Showcase, WhoItsFor, FinalCTA, Footer });
