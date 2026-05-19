// other-tabs.jsx — Project, Calls, Profile tabs.

// ── Project tab ─────────────────────────────────────────────────────────────
function ProjectTab({ theme, state }) {
  const history = [
    { date: 'May 13', score: 8, actions: 3, total: 3, summary: 'Shipped the intro draft.' },
    { date: 'May 12', score: 7, actions: 2, total: 3, summary: 'Got recommender confirmation.' },
    { date: 'May 11', score: 5, actions: 1, total: 3, summary: 'Slow day; got distracted.' },
    { date: 'May 10', score: 9, actions: 3, total: 3, summary: 'Finished essay question 1.' },
    { date: 'May 9',  score: 6, actions: 2, total: 3, summary: 'Outlined the personal statement.' },
    { date: 'May 8',  score: 8, actions: 3, total: 3, summary: 'Strong start. Clear plan.' },
    { date: 'May 7',  score: 7, actions: 2, total: 3, summary: 'Researched programs.' },
  ];

  return (
    <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '8px 4px 4px' }}>
        <SectionLabel theme={theme} style={{ padding: 0, marginBottom: 8 }}>Current goal</SectionLabel>
        <div style={{
          fontSize: 26, fontWeight: 600, letterSpacing: -0.7, lineHeight: 1.15,
          color: theme.text, marginBottom: 6, textWrap: 'pretty',
        }}>Finish my MBA application by December 1</div>
        <div style={{
          fontSize: 15, color: theme.textDim, letterSpacing: -0.2, lineHeight: 1.45,
          textWrap: 'pretty',
        }}>Round 1 deadlines for Stanford GSB, HBS, and Wharton. Focus is essays first, recommenders second.</div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '4px 0 6px' }}>
        <Card theme={theme} style={{ flex: 1, padding: '14px 16px' }}>
          <SectionLabel theme={theme} style={{ padding: 0, marginBottom: 6 }}>Started</SectionLabel>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>May 2</div>
          <div style={{ fontSize: 12.5, color: theme.textDim, marginTop: 2 }}>12 days ago</div>
        </Card>
        <Card theme={theme} style={{ flex: 1, padding: '14px 16px' }}>
          <SectionLabel theme={theme} style={{ padding: 0, marginBottom: 6 }}>Progress</SectionLabel>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
            38<span style={{ color: theme.textFaint, fontWeight: 400 }}>%</span>
          </div>
          <div style={{
            marginTop: 8, height: 4, borderRadius: 2,
            background: theme.hairline, overflow: 'hidden',
          }}>
            <div style={{ width: '38%', height: '100%', background: theme.accent, borderRadius: 2 }}/>
          </div>
        </Card>
      </div>

      <button style={{
        appearance: 'none', cursor: 'pointer',
        border: '0.5px solid ' + theme.hairlineStrong,
        background: theme.bg2, color: theme.text,
        height: 46, borderRadius: 14, padding: '0 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit', fontSize: 15, fontWeight: 500, letterSpacing: -0.2,
      }}>
        <Icons.edit size={16}/>Edit goal
      </button>

      <SectionLabel theme={theme} style={{ padding: '14px 4px 0' }}>History</SectionLabel>
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        {history.map((h, i) => {
          const sc = scoreColor(h.score, theme);
          return (
            <div key={i} style={{
              padding: '14px 16px',
              borderBottom: i === history.length - 1 ? 'none' : '0.5px solid ' + theme.hairline,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: sc + '1F',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                  fontSize: 18, fontWeight: 600, color: sc,
                  letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums',
                }}>{h.score}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2,
                }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{h.date}</div>
                  <div style={{
                    fontSize: 12.5, color: theme.textFaint, letterSpacing: -0.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{h.actions}/{h.total} actions</div>
                </div>
                <div style={{
                  fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1, lineHeight: 1.4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{h.summary}</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── Calls tab ───────────────────────────────────────────────────────────────
function CallsTab({ theme, openCall, openChat }) {
  const [sheet, setSheet] = React.useState(false);
  const items = [
    { kind: 'voice', when: 'This morning', meta: '5 min · 12 turns', summary: 'Set 3 actions: draft intro, email Sarah, outline Q2.' },
    { kind: 'chat',  when: 'Yesterday',    meta: '14 messages',       summary: 'Worked through doubts about the personal statement.' },
    { kind: 'voice', when: 'Yesterday',    meta: '6 min · evening',   summary: 'Reflected on strong day. Score 8.' },
    { kind: 'voice', when: 'May 12',       meta: '4 min · morning',   summary: 'Plan to wrap recommender follow-ups today.' },
    { kind: 'chat',  when: 'May 11',       meta: '8 messages',         summary: 'Quick brainstorm on essay question 2 angle.' },
    { kind: 'voice', when: 'May 11',       meta: '5 min · evening',   summary: 'Acknowledged slow day. Reset for tomorrow.' },
    { kind: 'voice', when: 'May 10',       meta: '7 min · morning',   summary: 'Three concrete actions for essay Q1.' },
  ];

  return (
    <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden', marginTop: 4 }}>
        {items.map((it, i) => (
          <button key={i} onClick={it.kind === 'voice' ? openCall : openChat} style={{
            appearance: 'none', border: 0, background: 'transparent', cursor: 'pointer',
            width: '100%', padding: '14px 16px',
            borderBottom: i === items.length - 1 ? 'none' : '0.5px solid ' + theme.hairline,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            fontFamily: 'inherit', color: theme.text,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: theme.accentSofter,
              color: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {it.kind === 'voice'
                ? <Icons.waves size={20}/>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11 7l-5 1 1-5a8 8 0 1115-3z"/></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                gap: 10, marginBottom: 2,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                  {it.kind === 'voice' ? 'Voice call' : 'Text chat'}
                </div>
                <div style={{ fontSize: 12, color: theme.textFaint, letterSpacing: -0.1, flexShrink: 0 }}>{it.when}</div>
              </div>
              <div style={{
                fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
              }}>{it.summary}</div>
              <div style={{
                fontSize: 11.5, color: theme.textFaint, marginTop: 4, letterSpacing: -0.1,
              }}>{it.meta}</div>
            </div>
          </button>
        ))}
      </Card>

      {/* Floating new conversation button */}
      <button onClick={() => setSheet(true)} style={{
        position: 'absolute', right: 16, bottom: 16,
        width: 56, height: 56, borderRadius: 28, border: 0,
        background: theme.accent, color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 30px ' + theme.accent + '66',
      }}>
        <Icons.plus size={26} stroke={2.4}/>
      </button>

      {/* Sheet */}
      {sheet && (
        <NewConversationSheet theme={theme}
          onClose={() => setSheet(false)}
          onVoice={() => { setSheet(false); openCall(); }}
          onChat={() => { setSheet(false); openChat(); }}/>
      )}
    </div>
  );
}

function NewConversationSheet({ theme, onClose, onVoice, onChat }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
        animation: 'fade-in 0.2s ease',
      }}/>
      <div style={{
        position: 'relative', background: theme.bg2,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '12px 20px 36px',
        animation: 'sheet-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: theme.hairlineStrong,
          margin: '0 auto 16px',
        }}/>
        <div style={{
          fontSize: 19, fontWeight: 600, letterSpacing: -0.4, color: theme.text,
          marginBottom: 14,
        }}>New conversation</div>
        <button onClick={onVoice} style={{
          appearance: 'none', border: 0, cursor: 'pointer',
          width: '100%', padding: '16px 0',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'transparent', color: theme.text,
          borderBottom: '0.5px solid ' + theme.hairline, textAlign: 'left',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22, background: theme.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icons.mic size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>Voice call</div>
            <div style={{ fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1 }}>Talk it through, hands-free.</div>
          </div>
          <span style={{ color: theme.textFaint }}><Icons.chevR/></span>
        </button>
        <button onClick={onChat} style={{
          appearance: 'none', border: 0, cursor: 'pointer',
          width: '100%', padding: '16px 0',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'transparent', color: theme.text, textAlign: 'left',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22, background: theme.bg3, color: theme.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11 7l-5 1 1-5a8 8 0 1115-3z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>Text chat</div>
            <div style={{ fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1 }}>Type it out instead.</div>
          </div>
          <span style={{ color: theme.textFaint }}><Icons.chevR/></span>
        </button>
      </div>
    </div>
  );
}

// ── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab({ theme, state, setState, onSignOut }) {
  const Row = ({ label, value, accent, onClick, last }) => (
    <div onClick={onClick} style={{
      padding: '14px 18px',
      borderBottom: last ? 'none' : '0.5px solid ' + theme.hairline,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ fontSize: 15.5, color: accent || theme.text, letterSpacing: -0.2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {value !== undefined && (
          <div style={{ fontSize: 14.5, color: theme.textDim, letterSpacing: -0.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        )}
        {onClick && <span style={{ color: theme.textFaint }}><Icons.chevR size={16}/></span>}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Subscription card */}
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '20px 20px 18px',
          background: 'linear-gradient(135deg, ' + theme.accent + '20, ' + theme.accent + '08)',
          borderBottom: '0.5px solid ' + theme.hairline,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
            color: theme.accent, marginBottom: 10,
            background: theme.bg2, padding: '4px 10px', borderRadius: 999,
          }}>
            <Icons.sparkle size={12} stroke={2}/> Trial
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, marginBottom: 4 }}>
            Life Coach Plus
          </div>
          <div style={{ fontSize: 13.5, color: theme.textDim, letterSpacing: -0.1 }}>
            5 days left in your trial · renews May 19 at $10.75/mo
          </div>
        </div>
        <Row label="Manage subscription" onClick={() => {}} last/>
      </Card>

      <div>
        <SectionLabel theme={theme}>Reminders</SectionLabel>
        <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
          <Row label="Morning call reminder" value="7:30 AM" onClick={() => {}}/>
          <Row label="Evening reminder"      value="9:00 PM" onClick={() => {}}/>
          <ToggleRow theme={theme} label="Push notifications" value={state.pushOn}
                     onChange={(v) => setState((s) => ({ ...s, pushOn: v }))} last/>
        </Card>
      </div>

      <div>
        <SectionLabel theme={theme}>Privacy</SectionLabel>
        <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
          <Row label="Export my data" onClick={() => {}}/>
          <Row label="Delete history" accent={theme.red} onClick={() => {}} last/>
        </Card>
      </div>

      <div>
        <SectionLabel theme={theme}>Account</SectionLabel>
        <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
          <Row label="Help & support" onClick={() => {}}/>
          <Row label="Sign out" accent={theme.red} onClick={onSignOut} last/>
        </Card>
      </div>

      <div style={{
        textAlign: 'center', fontSize: 11, color: theme.textFaint,
        padding: '20px 0 0', letterSpacing: -0.1,
      }}>Life Coach 1.2.0</div>
    </div>
  );
}

function ToggleRow({ theme, label, value, onChange, last }) {
  return (
    <div style={{
      padding: '12px 18px',
      borderBottom: last ? 'none' : '0.5px solid ' + theme.hairline,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 15.5, color: theme.text, letterSpacing: -0.2 }}>{label}</div>
      <button onClick={() => onChange(!value)} style={{
        appearance: 'none', border: 0, cursor: 'pointer',
        position: 'relative', width: 52, height: 32, borderRadius: 16,
        background: value ? '#34c759' : theme.hairlineStrong,
        transition: 'background 0.18s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 22 : 2,
          width: 28, height: 28, borderRadius: 14, background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.18s',
        }}/>
      </button>
    </div>
  );
}

Object.assign(window, { ProjectTab, CallsTab, ProfileTab });
