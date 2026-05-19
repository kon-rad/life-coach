// home-tab.jsx — Home tab with score hero, micro-actions, call CTA, streak.

function HomeTab({ theme, state, setState, openCall, openChat }) {
  const isMorning = state.timeOfDay === 'morning';
  const greeting = isMorning ? 'Good morning.' : 'Good evening.';
  const sub = isMorning
    ? 'Ready when you are.'
    : "How did today go?";

  const score = state.todayScore;
  const sc = scoreColor(score, theme);
  const callDone = isMorning ? state.morningDone : state.eveningDone;

  const completedCount = state.actions.filter((a) => a.done).length;
  const totalCount = state.actions.length;

  const toggleAction = (i) => {
    setState((s) => ({
      ...s, actions: s.actions.map((a, j) => j === i ? { ...a, done: !a.done } : a),
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px 100px' }}>
      {/* Greeting */}
      <div style={{ padding: '8px 4px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint, marginBottom: 6 }}>
          Wednesday, May 14
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1, color: theme.text }}>{greeting}</div>
        <div style={{ fontSize: 17, color: theme.textDim, marginTop: 4, letterSpacing: -0.2 }}>{sub}</div>
      </div>

      {/* Score card — hero */}
      <Card theme={theme} style={{ padding: '22px 22px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <SectionLabel theme={theme} style={{ padding: 0 }}>Yesterday's score</SectionLabel>
          <div style={{ fontSize: 12, color: theme.textFaint, letterSpacing: -0.1 }}>May 13</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '4px 0 6px' }}>
          <div style={{
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontSize: 92, fontWeight: 500, color: sc,
            letterSpacing: -4, lineHeight: 0.95,
            fontVariantNumeric: 'tabular-nums',
          }}>{score}</div>
          <div style={{
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontSize: 32, color: theme.textFaint, fontWeight: 400,
            letterSpacing: -1, paddingBottom: 12,
          }}>/10</div>
          <div style={{ flex: 1 }} />
          <div style={{
            fontSize: 13, color: theme.textDim, paddingBottom: 16, letterSpacing: -0.1,
            textAlign: 'right', maxWidth: 130, lineHeight: 1.35,
          }}>You shipped the intro draft. Real momentum.</div>
        </div>
        <div style={{ margin: '0 -4px -4px' }}>
          <ScoreWave color={sc} width={320} height={36} intensity={Math.max(0.4, score / 10)} />
        </div>
      </Card>

      {/* Call CTA */}
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        <button onClick={openCall} disabled={callDone} style={{
          appearance: 'none', border: 0, width: '100%', cursor: callDone ? 'default' : 'pointer',
          background: 'transparent', padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: 'inherit', color: theme.text, textAlign: 'left',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: callDone ? theme.bg3 : theme.accent,
            color: callDone ? theme.textDim : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {callDone ? <Icons.check size={22} stroke={2.4}/> : <Icons.mic size={22}/>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, marginBottom: 2 }}>
              {callDone
                ? (isMorning ? 'Morning call complete' : 'Evening call complete')
                : (isMorning ? 'Start morning call' : 'Start evening reflection')}
            </div>
            <div style={{ fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1 }}>
              {callDone ? 'See you ' + (isMorning ? 'tonight' : 'in the morning') + '.'
                        : (isMorning ? '5 minutes · plan the day' : '5 minutes · score the day')}
            </div>
          </div>
          {!callDone && <span style={{ color: theme.textFaint }}><Icons.chevR/></span>}
        </button>
      </Card>

      {/* Micro-actions */}
      <Card theme={theme} style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <SectionLabel theme={theme} style={{ padding: 0 }}>Today's actions</SectionLabel>
          <div style={{ fontSize: 12, color: theme.textFaint, letterSpacing: -0.1, fontVariantNumeric: 'tabular-nums' }}>
            {completedCount}/{totalCount}
          </div>
        </div>
        <div>
          {state.actions.map((a, i) => (
            <CheckRow key={i} label={a.label} hint={a.hint} checked={a.done}
                      onToggle={() => toggleAction(i)} theme={theme}
                      last={i === state.actions.length - 1} />
          ))}
        </div>
      </Card>

      {/* Streak + stats */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Card theme={theme} style={{ flex: 1, padding: '16px 18px' }}>
          <SectionLabel theme={theme} style={{ padding: 0, marginBottom: 8 }}>Streak</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <div style={{
              fontSize: 32, fontWeight: 600, letterSpacing: -1, color: theme.text,
              fontVariantNumeric: 'tabular-nums',
            }}>12</div>
            <div style={{ fontSize: 13, color: theme.textDim }}>days</div>
          </div>
        </Card>
        <Card theme={theme} style={{ flex: 1, padding: '16px 18px' }}>
          <SectionLabel theme={theme} style={{ padding: 0, marginBottom: 8 }}>Avg score</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <div style={{
              fontSize: 32, fontWeight: 600, letterSpacing: -1, color: theme.text,
              fontVariantNumeric: 'tabular-nums',
            }}>7.4</div>
            <div style={{ fontSize: 13, color: theme.textDim }}>this week</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { HomeTab });
