// landing-mocks.jsx — Static iPhone-screen mockups for the landing page.
// Each renders inside the existing IOSDevice frame. They share tokens with
// the app via makeTheme(true, '#4f5dff').

// ── Mini reusable bits ──────────────────────────────────────────────────────
function MockSectionLabel({ children, theme, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
      textTransform: 'uppercase', color: theme.textFaint,
      ...style,
    }}>{children}</div>
  );
}

function MockHairline({ theme }) {
  return <div style={{ height: 0.5, background: theme.hairline }}/>;
}

// ── Home screen mockup — score hero + actions + call CTA ────────────────────
function MockHome({ theme }) {
  const sc = theme.ok;
  return (
    <div style={{ padding: '50px 16px 90px', height: '100%', background: theme.bg, color: theme.text, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '8px 4px 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint, marginBottom: 4 }}>
          Wed, May 14
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.7, lineHeight: 1.1 }}>Good morning.</div>
        <div style={{ fontSize: 14.5, color: theme.textDim, marginTop: 2, letterSpacing: -0.2 }}>Ready when you are.</div>
      </div>

      {/* Score card */}
      <div style={{ background: theme.bg2, borderRadius: 20, border: '0.5px solid ' + theme.hairline, padding: '16px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <MockSectionLabel theme={theme}>Yesterday's score</MockSectionLabel>
          <div style={{ fontSize: 11, color: theme.textFaint }}>May 13</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontSize: 72, fontWeight: 500, color: sc,
            letterSpacing: -3, lineHeight: 0.95,
            fontVariantNumeric: 'tabular-nums',
          }}>8</div>
          <div style={{
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontSize: 24, color: theme.textFaint, fontWeight: 400,
            letterSpacing: -0.8, paddingBottom: 8,
          }}>/10</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11.5, color: theme.textDim, paddingBottom: 12, textAlign: 'right', maxWidth: 110, lineHeight: 1.3 }}>
            You shipped the intro draft. Real momentum.
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <ScoreWave color={sc} width={300} height={28} intensity={0.85}/>
        </div>
      </div>

      {/* Call CTA */}
      <div style={{ background: theme.bg2, borderRadius: 20, border: '0.5px solid ' + theme.hairline, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 23,
          background: theme.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 20px ' + theme.accent + '55',
        }}>
          <Icons.mic size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2 }}>Start morning call</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 1 }}>5 minutes · plan the day</div>
        </div>
        <span style={{ color: theme.textFaint }}><Icons.chevR size={16}/></span>
      </div>

      {/* Actions */}
      <div style={{ background: theme.bg2, borderRadius: 20, border: '0.5px solid ' + theme.hairline, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <MockSectionLabel theme={theme}>Today's actions</MockSectionLabel>
          <div style={{ fontSize: 11, color: theme.textFaint, fontVariantNumeric: 'tabular-nums' }}>1/3</div>
        </div>
        {[
          { t: 'Draft personal statement intro', h: '30 min, no editing', done: true },
          { t: 'Email Sarah for recommender', h: 'Short check-in', done: false },
          { t: 'Outline answer to essay Q2', h: 'Bullets only', done: false },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 0',
            borderBottom: i < 2 ? '0.5px solid ' + theme.hairline : 'none',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, marginTop: 1,
              border: '1.5px solid ' + (a.done ? theme.accent : theme.hairlineStrong),
              background: a.done ? theme.accent : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {a.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: -0.2, color: theme.text, textDecoration: a.done ? 'line-through' : 'none', opacity: a.done ? 0.5 : 1 }}>{a.t}</div>
              <div style={{ fontSize: 11.5, color: theme.textDim, marginTop: 2, opacity: a.done ? 0.5 : 1 }}>{a.h}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Voice call mockup — full-bleed black ────────────────────────────────────
function MockCall({ theme, listening = true }) {
  return (
    <div style={{ height: '100%', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 50% 45%, ${theme.accent}33, transparent 55%)` }}/>
      <div style={{ position: 'relative', paddingTop: 50, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Morning Call</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>Life Coach</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>2:14</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <BigWaveform color={theme.accent} width={340} height={180} active={true} listening={listening}/>
        <div style={{ marginTop: 16, fontSize: 11, fontWeight: 500, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: '#34c759' }}/>
          Listening
        </div>
        <div style={{ marginTop: 28, maxWidth: 280, textAlign: 'center', fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.35, letterSpacing: -0.3 }}>
          What's the one thing that would move this forward?
        </div>
      </div>
      <div style={{ padding: '16px 36px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        {[<Icons.mic size={20}/>, null, <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M16 9a5 5 0 010 6"/></svg>].map((ic, i) => (
          i === 1 ? (
            <div key={i} style={{ width: 60, height: 60, borderRadius: 30, background: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,69,58,0.4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M21 12c-1.5-1.4-3.5-2.3-5.5-2.7l-.4 2.1c-.3 1.6-.6 1.9-2.2 1.9h-1.8c-1.6 0-1.9-.3-2.2-1.9l-.4-2.1c-2 .4-4 1.3-5.5 2.7l3.1 3.1c1 1 1.7 1 2.7 0l1.3-1.3c.4-.4.9-.4 1.4 0l1.3 1.3c1 1 1.7 1 2.7 0L21 12z"/></svg>
            </div>
          ) : (
            <div key={i} style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {ic}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// ── Project tab mockup ──────────────────────────────────────────────────────
function MockProject({ theme }) {
  const history = [
    { d: 'May 13', s: 8, sum: 'Shipped intro draft.' },
    { d: 'May 12', s: 7, sum: 'Recommender confirmed.' },
    { d: 'May 11', s: 5, sum: 'Slow day, got distracted.' },
    { d: 'May 10', s: 9, sum: 'Finished essay Q1.' },
  ];
  return (
    <div style={{ padding: '50px 16px 70px', background: theme.bg, color: theme.text, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '4px 4px 6px' }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.7, lineHeight: 1.1 }}>Project</div>
      </div>
      <div style={{ padding: '4px' }}>
        <MockSectionLabel theme={theme} style={{ marginBottom: 6 }}>Current goal</MockSectionLabel>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 4 }}>Finish my MBA application by December 1</div>
        <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.4 }}>Stanford GSB, HBS, Wharton — essays first.</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: theme.bg2, borderRadius: 14, padding: '12px 14px', border: '0.5px solid ' + theme.hairline }}>
          <MockSectionLabel theme={theme} style={{ marginBottom: 4 }}>Streak</MockSectionLabel>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>12 <span style={{ fontSize: 11, color: theme.textDim, fontWeight: 400 }}>days</span></div>
        </div>
        <div style={{ flex: 1, background: theme.bg2, borderRadius: 14, padding: '12px 14px', border: '0.5px solid ' + theme.hairline }}>
          <MockSectionLabel theme={theme} style={{ marginBottom: 4 }}>Progress</MockSectionLabel>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>38<span style={{ color: theme.textFaint, fontWeight: 400 }}>%</span></div>
          <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: theme.hairline, overflow: 'hidden' }}>
            <div style={{ width: '38%', height: '100%', background: theme.accent }}/>
          </div>
        </div>
      </div>
      <MockSectionLabel theme={theme} style={{ padding: '8px 4px 0' }}>History</MockSectionLabel>
      <div style={{ background: theme.bg2, borderRadius: 18, border: '0.5px solid ' + theme.hairline, overflow: 'hidden' }}>
        {history.map((h, i) => {
          const sc = scoreColor(h.s, theme);
          return (
            <div key={i} style={{ padding: '11px 14px', borderBottom: i < history.length - 1 ? '0.5px solid ' + theme.hairline : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: sc + '1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: 15, fontWeight: 600, color: sc }}>{h.s}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2 }}>{h.d}</div>
                <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.sum}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Text chat mockup ────────────────────────────────────────────────────────
function MockChat({ theme }) {
  const msgs = [
    { from: 'ai', text: "Good morning. How are you feeling about today?" },
    { from: 'me', text: "A bit scattered. I have a lot on my plate." },
    { from: 'ai', text: "Worth slowing down for. What's the one thing that would matter most if you moved it forward?" },
    { from: 'me', text: "The personal statement. I've been avoiding it." },
    { from: 'ai', text: "Let's start there. Forget polish. What's the first true sentence you could write?" },
  ];
  return (
    <div style={{ background: theme.bg, color: theme.text, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingTop: 50, paddingBottom: 12, textAlign: 'center', borderBottom: '0.5px solid ' + theme.hairline }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Life Coach</div>
        <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: '#34c759', marginRight: 4, verticalAlign: 'middle' }}/>Online
        </div>
      </div>
      <div style={{ flex: 1, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {msgs.map((m, i) => {
          const last = i === msgs.length - 1 || msgs[i + 1]?.from !== m.from;
          const mine = m.from === 'me';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: last ? 6 : 0 }}>
              <div style={{
                maxWidth: '78%', padding: '8px 12px',
                borderRadius: 17,
                borderBottomRightRadius: mine && last ? 5 : 17,
                borderBottomLeftRadius: !mine && last ? 5 : 17,
                background: mine ? theme.accent : theme.bg2,
                color: mine ? '#fff' : theme.text,
                fontSize: 13.5, lineHeight: 1.4, letterSpacing: -0.1,
                border: mine ? 'none' : '0.5px solid ' + theme.hairline,
              }}>{m.text}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 12px 24px', borderTop: '0.5px solid ' + theme.hairline }}>
        <div style={{ display: 'flex', alignItems: 'center', background: theme.bg2, border: '0.5px solid ' + theme.hairlineStrong, borderRadius: 18, padding: '0 6px 0 14px', minHeight: 34 }}>
          <div style={{ flex: 1, color: theme.textFaint, fontSize: 13.5, padding: '6px 0' }}>Message</div>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: theme.hairlineStrong, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MockHome, MockCall, MockProject, MockChat });
