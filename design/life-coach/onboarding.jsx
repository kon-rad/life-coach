// onboarding.jsx — 5-screen onboarding flow.

// ── Step indicator: small dots ──────────────────────────────────────────────
function StepDots({ count, current, theme }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i === current ? theme.accent : theme.hairlineStrong,
          transition: 'all 0.25s',
        }} />
      ))}
    </div>
  );
}

// ── Iconographic line illustrations (centered, ~120px) ──────────────────────
function IllusShield({ color }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 18l30 12v22c0 18-13 30-30 34-17-4-30-16-30-34V30l30-12z" />
      <path d="M48 60l9 9 18-19" strokeWidth="2.2"/>
      <circle cx="60" cy="60" r="44" strokeOpacity="0.15" />
    </svg>
  );
}

function IllusMic({ color }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="48" y="26" width="24" height="46" rx="12"/>
      <path d="M34 58a26 26 0 0052 0"/>
      <path d="M60 84v16M48 100h24"/>
      <path d="M22 58c0 16 9 27 22 32M98 58c0 16-9 27-22 32" strokeOpacity="0.25"/>
    </svg>
  );
}

function IllusTarget({ color }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="60" r="44"/>
      <circle cx="60" cy="60" r="28"/>
      <circle cx="60" cy="60" r="12"/>
      <circle cx="60" cy="60" r="3" fill={color} stroke="none"/>
      <path d="M60 16v6M60 98v6M16 60h6M98 60h6" strokeOpacity="0.4"/>
    </svg>
  );
}

function IllusScore({ color }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 76c8 0 8-20 16-20s8 36 16 36 8-52 16-52 8 36 16 36 8-20 16-20" strokeWidth="2"/>
      <path d="M16 92h88" strokeOpacity="0.25"/>
      <circle cx="60" cy="40" r="3" fill={color} stroke="none"/>
    </svg>
  );
}

// ── Onboarding container ────────────────────────────────────────────────────
function Onboarding({ theme, step, setStep, onFinish }) {
  const screens = [Welcome, Privacy, SignIn, Goal, HowItWorks];
  const Screen = screens[step];
  const next = () => step < 4 ? setStep(step + 1) : onFinish();
  return (
    <div style={{
      background: theme.bg, height: '100%', display: 'flex', flexDirection: 'column',
      paddingTop: 60, color: theme.text,
    }}>
      <Screen theme={theme} next={next} step={step} setStep={setStep} onFinish={onFinish} />
      <div style={{ padding: '20px 0 28px' }}>
        <StepDots count={5} current={step} theme={theme} />
      </div>
    </div>
  );
}

// ── 1. Welcome ──────────────────────────────────────────────────────────────
function Welcome({ theme, next }) {
  const bullets = [
    'One goal. Daily progress.',
    'Two short voice calls a day.',
    'A score that means something.',
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 16px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Brand mark */}
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: theme.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32,
          boxShadow: '0 10px 30px ' + theme.accent + '55',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/>
          </svg>
        </div>
        <div style={{
          fontSize: 40, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.05,
          marginBottom: 14,
        }}>Life Coach.</div>
        <div style={{
          fontSize: 19, fontWeight: 400, color: theme.textDim,
          letterSpacing: -0.3, lineHeight: 1.4, marginBottom: 36,
          maxWidth: 320,
        }}>Your AI life coach. Private by design.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 6, height: 6, borderRadius: 3, background: theme.accent,
              }}/>
              <span style={{ fontSize: 16, letterSpacing: -0.2, color: theme.text }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <PrimaryButton theme={theme} onClick={next}>Get Started</PrimaryButton>
    </div>
  );
}

// ── 2. Privacy ──────────────────────────────────────────────────────────────
function Privacy({ theme, next }) {
  const bullets = [
    { t: 'End-to-end encrypted', d: 'Your conversations are encrypted on-device and in transit.' },
    { t: 'No identity required', d: 'We don\'t ask for your name. The AI doesn\'t know who you are.' },
    { t: 'Delete anytime', d: 'Wipe your history in one tap. We keep nothing after.' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 36px' }}>
        <IllusShield color={theme.accent}/>
      </div>
      <div style={{
        fontSize: 30, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1,
        marginBottom: 12, textWrap: 'pretty',
      }}>Private by design.</div>
      <div style={{
        fontSize: 16, color: theme.textDim, letterSpacing: -0.2, lineHeight: 1.45,
        marginBottom: 28, textWrap: 'pretty',
      }}>The deepest conversations need the strongest privacy. Here's how we protect yours.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, marginTop: 1,
              background: theme.accentSoft, color: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, marginBottom: 3 }}>{b.t}</div>
              <div style={{ fontSize: 14, color: theme.textDim, letterSpacing: -0.1, lineHeight: 1.45 }}>{b.d}</div>
            </div>
          </div>
        ))}
      </div>
      <PrimaryButton theme={theme} onClick={next}>Continue</PrimaryButton>
    </div>
  );
}

// ── 3. Sign In ──────────────────────────────────────────────────────────────
function SignIn({ theme, next }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 16px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 12 }}>
        <div style={{
          fontSize: 30, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1,
          marginBottom: 12,
        }}>Sign in.</div>
        <div style={{
          fontSize: 16, color: theme.textDim, letterSpacing: -0.2, lineHeight: 1.45,
          marginBottom: 32, textWrap: 'pretty',
        }}>We use your account only for sync. Your conversations stay private.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
        <button onClick={next} style={{
          appearance: 'none', border: 0, cursor: 'pointer',
          height: 54, borderRadius: 16,
          background: theme.dark ? '#fff' : '#000', color: theme.dark ? '#000' : '#fff',
          fontFamily: 'inherit', fontSize: 17, fontWeight: 500, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12.5c0-2.6 2.1-3.9 2.2-3.9-1.2-1.7-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.7-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-3.7zM14 4.5c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.5-.7.8-1.3 2-1.1 3.2 1.1.1 2.2-.5 3-1.4z"/></svg>
          Continue with Apple
        </button>
        <button onClick={next} style={{
          appearance: 'none', cursor: 'pointer',
          border: '0.5px solid ' + theme.hairlineStrong,
          height: 54, borderRadius: 16, background: theme.bg2, color: theme.text,
          fontFamily: 'inherit', fontSize: 17, fontWeight: 500, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <Icons.google/>
          Continue with Google
        </button>
        <div style={{
          textAlign: 'center', fontSize: 12, color: theme.textFaint,
          marginTop: 8, letterSpacing: -0.1, lineHeight: 1.5,
        }}>
          By continuing you agree to our<br/>Terms and Privacy Policy.
        </div>
      </div>
    </div>
  );
}

// ── 4. Your Goal ────────────────────────────────────────────────────────────
function Goal({ theme, next }) {
  const [goal, setGoal] = React.useState('');
  const examples = [
    'Run a half marathon by April',
    'Finish my MBA application',
    'Write 500 words a day',
    'Sleep before 11pm',
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 16px' }}>
      <div style={{
        fontSize: 30, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1,
        marginBottom: 12,
      }}>What's your goal?</div>
      <div style={{
        fontSize: 16, color: theme.textDim, letterSpacing: -0.2, lineHeight: 1.45,
        marginBottom: 24, textWrap: 'pretty',
      }}>One thing you want to make progress on. We'll work on it together, daily.</div>

      <div style={{
        background: theme.bg2, borderRadius: 18,
        border: '0.5px solid ' + theme.hairline,
        padding: '14px 16px 14px',
        marginBottom: 14,
        minHeight: 120,
      }}>
        <textarea
          value={goal} onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Launch my side project by March 1…"
          style={{
            width: '100%', minHeight: 96, resize: 'none',
            border: 0, outline: 0, background: 'transparent',
            color: theme.text, fontFamily: 'inherit', fontSize: 17,
            letterSpacing: -0.2, lineHeight: 1.4,
          }}
        />
      </div>

      <button onClick={() => {}} style={{
        appearance: 'none', cursor: 'pointer',
        border: '0.5px solid ' + theme.hairline,
        background: theme.bg2, color: theme.text,
        height: 44, borderRadius: 14, padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'inherit', fontSize: 15, letterSpacing: -0.2,
        marginBottom: 22, width: 'auto', alignSelf: 'flex-start',
      }}>
        <span style={{ color: theme.accent, display: 'flex' }}><Icons.mic size={18}/></span>
        Speak your goal
      </button>

      <SectionLabel theme={theme}>Try an example</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'auto' }}>
        {examples.map((ex) => (
          <button key={ex} onClick={() => setGoal(ex)} style={{
            appearance: 'none', cursor: 'pointer',
            border: '0.5px solid ' + theme.hairline,
            background: theme.bg2, color: theme.textDim,
            padding: '8px 14px', borderRadius: 999,
            fontFamily: 'inherit', fontSize: 13.5, letterSpacing: -0.1,
          }}>{ex}</button>
        ))}
      </div>

      <div style={{ paddingTop: 20 }}>
        <PrimaryButton theme={theme} onClick={next} disabled={!goal.trim()}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

// ── 5. How It Works + Paywall ───────────────────────────────────────────────
function HowItWorks({ theme, onFinish }) {
  const [plan, setPlan] = React.useState('annual');
  const steps = [
    { icon: <IllusMic color={theme.accent}/>, t: 'Morning voice call', d: 'Five minutes to set the day. The AI gives you 3 micro-actions.' },
    { icon: <IllusTarget color={theme.accent}/>, t: 'Three micro-actions', d: 'Small, specific, doable. Check them off as you go.' },
    { icon: <IllusScore color={theme.accent}/>, t: 'Evening reflection', d: 'A short call. You get a score from 0 to 10.' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 16px', overflowY: 'auto' }}>
      <div style={{
        fontSize: 28, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1,
        marginBottom: 22,
      }}>How it works.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, alignItems: 'center',
            background: theme.bg2, borderRadius: 18,
            border: '0.5px solid ' + theme.hairline,
            padding: '14px 16px',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: theme.accentSofter,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ transform: 'scale(0.5)' }}>{s.icon}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: -0.2, marginBottom: 2 }}>{s.t}</div>
              <div style={{ fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1, lineHeight: 1.4 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan picker */}
      <div style={{
        background: theme.bg2, borderRadius: 22,
        border: '0.5px solid ' + theme.hairline,
        padding: 16, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Life Coach Plus</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, textTransform: 'uppercase', letterSpacing: 0.6 }}>7-day free trial</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'monthly', label: 'Monthly', price: '$19', sub: 'per month' },
            { id: 'annual', label: 'Annual', price: '$129', sub: '$10.75/mo · save 43%' },
          ].map((p) => {
            const on = plan === p.id;
            return (
              <button key={p.id} onClick={() => setPlan(p.id)} style={{
                appearance: 'none', flex: 1, cursor: 'pointer',
                border: on ? '1.5px solid ' + theme.accent : '0.5px solid ' + theme.hairlineStrong,
                background: on ? theme.accentSofter : 'transparent',
                color: theme.text, padding: '12px 14px',
                borderRadius: 14, textAlign: 'left',
                fontFamily: 'inherit', letterSpacing: -0.2,
              }}>
                <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 4, fontWeight: 500 }}>{p.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{p.price}</div>
                <div style={{ fontSize: 11.5, color: theme.textDim, marginTop: 2 }}>{p.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <PrimaryButton theme={theme} onClick={onFinish}>Start free trial</PrimaryButton>
      <div style={{
        textAlign: 'center', fontSize: 12, color: theme.textFaint,
        marginTop: 10, letterSpacing: -0.1,
      }}>Cancel anytime. No charge until day 7.</div>
    </div>
  );
}

Object.assign(window, { Onboarding });
