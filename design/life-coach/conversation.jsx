// conversation.jsx — Voice call screen + Text chat screen.

// ── Voice call screen — full-bleed ──────────────────────────────────────────
function VoiceCallScreen({ theme, onEnd, timeOfDay }) {
  const [t, setT] = React.useState(0);
  const [listening, setListening] = React.useState(true);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Toggle listening every ~4 seconds to feel like a back-and-forth conversation
  React.useEffect(() => {
    const id = setInterval(() => setListening((l) => !l), 4200);
    return () => clearInterval(id);
  }, []);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const aiLines = [
    'I\'m listening.',
    'Tell me how you\'d like today to go.',
    'What\'s the one thing that would move this forward?',
  ];
  const userPrompt = "Walk me through your goals.";
  const status = muted
    ? 'Muted'
    : listening ? 'Listening' : 'Speaking';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column',
      animation: 'fade-in 0.3s ease',
    }}>
      {/* subtle accent glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 50% 45%, ${theme.accent}33, transparent 55%)`,
        opacity: listening ? 0.9 : 0.4,
        transition: 'opacity 0.6s',
      }}/>

      {/* status bar */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <IOSStatusBar dark={true} />
      </div>

      {/* Top header — coach name + status */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '8px 24px 0', textAlign: 'center',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6,
        }}>{timeOfDay === 'morning' ? 'Morning Call' : 'Evening Call'}</div>
        <div style={{
          fontSize: 28, fontWeight: 600, letterSpacing: -0.6, color: '#fff',
        }}>Life Coach</div>
        <div style={{
          marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.6)',
          letterSpacing: -0.1, fontVariantNumeric: 'tabular-nums',
        }}>{fmt(t)}</div>
      </div>

      {/* Waveform — center hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1, padding: '0 16px',
      }}>
        <BigWaveform color={theme.accent} width={360} height={200}
                     active={!muted} listening={listening}/>
        <div style={{
          marginTop: 18, fontSize: 13, fontWeight: 500, letterSpacing: 1.6,
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3,
            background: muted ? '#ff453a' : listening ? '#34c759' : theme.accent,
            animation: !muted && listening ? 'pulse 1.4s ease-in-out infinite' : 'none',
          }}/>
          {status}
        </div>

        {/* Live transcript preview */}
        <div style={{
          marginTop: 36, maxWidth: 320, textAlign: 'center',
          fontSize: 20, fontWeight: 400, color: '#fff',
          letterSpacing: -0.4, lineHeight: 1.35,
          textWrap: 'pretty',
          opacity: muted ? 0.3 : 1, transition: 'opacity 0.3s',
        }}>
          {listening ? (
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{userPrompt}</span>
          ) : (
            aiLines[t % aiLines.length]
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 40px 56px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
      }}>
        <CallButton onClick={() => setMuted((m) => !m)}
          icon={muted
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M9 9v6a3 3 0 005 2.2M15 12V6a3 3 0 00-6 0v3"/><path d="M19 11a7 7 0 01-1.8 4.7M12 19v3"/></svg>
            : <Icons.mic size={24}/>}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}/>
        <button onClick={onEnd} style={{
          appearance: 'none', border: 0, cursor: 'pointer',
          width: 72, height: 72, borderRadius: 36,
          background: '#ff453a', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(255,69,58,0.4)',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12c-1.5-1.4-3.5-2.3-5.5-2.7l-.4 2.1c-.3 1.6-.6 1.9-2.2 1.9h-1.8c-1.6 0-1.9-.3-2.2-1.9l-.4-2.1c-2 .4-4 1.3-5.5 2.7l3.1 3.1c1 1 1.7 1 2.7 0l1.3-1.3c.4-.4.9-.4 1.4 0l1.3 1.3c1 1 1.7 1 2.7 0L21 12z"/></svg>
        </button>
        <CallButton
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M16 9a5 5 0 010 6"/></svg>}
          label="Speaker"/>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}

function CallButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer',
      background: 'transparent', border: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      color: '#fff', fontFamily: 'inherit',
    }}>
      <div style={{
        width: 62, height: 62, borderRadius: 31,
        background: active ? '#fff' : 'rgba(255,255,255,0.14)',
        color: active ? '#000' : '#fff',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '0.5px solid rgba(255,255,255,0.2)',
      }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: -0.1 }}>{label}</div>
    </button>
  );
}

// ── Text chat screen ────────────────────────────────────────────────────────
function TextChatScreen({ theme, onClose }) {
  const initial = [
    { from: 'ai', text: "Good morning. How are you feeling about today?" },
    { from: 'me', text: "A bit scattered, honestly. I have a lot on my plate." },
    { from: 'ai', text: "That's worth slowing down for. What's the one thing on your plate that, if you moved it forward today, would matter most?" },
    { from: 'me', text: "The personal statement. I've been avoiding the intro." },
    { from: 'ai', text: "Let's start there. Forget polish. What's the first true sentence you could write?" },
  ];
  const [msgs, setMsgs] = React.useState(initial);
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setMsgs((m) => [...m, { from: 'me', text: txt }]);
    setInput('');
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'ai', text: 'I hear you. Take a breath — what feels true about that?' }]);
    }, 700);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 180,
      display: 'flex', flexDirection: 'column',
      background: theme.bg, color: theme.text,
      animation: 'fade-in 0.2s ease',
    }}>
      <IOSStatusBar dark={theme.dark} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 16px 12px',
        borderBottom: '0.5px solid ' + theme.hairline,
      }}>
        <button onClick={onClose} style={{
          appearance: 'none', border: 0, background: 'transparent',
          color: theme.accent, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 2,
          fontFamily: 'inherit', fontSize: 16, letterSpacing: -0.2,
        }}>
          <Icons.chevL size={20} stroke={2.4}/>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Life Coach</div>
          <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 500 }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: 3,
              background: '#34c759', marginRight: 5, verticalAlign: 'middle',
            }}/>Online
          </div>
        </div>
        <div style={{ width: 24 }}/>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: '16px 14px 8px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {msgs.map((m, i) => {
          const last = i === msgs.length - 1 || msgs[i + 1]?.from !== m.from;
          const mine = m.from === 'me';
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
              marginBottom: last ? 6 : 0,
            }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px',
                borderRadius: 20,
                borderBottomRightRadius: mine && last ? 6 : 20,
                borderBottomLeftRadius: !mine && last ? 6 : 20,
                background: mine ? theme.accent : theme.bg2,
                color: mine ? '#fff' : theme.text,
                fontSize: 15.5, lineHeight: 1.4, letterSpacing: -0.2,
                border: mine ? 'none' : '0.5px solid ' + theme.hairline,
                textWrap: 'pretty',
              }}>{m.text}</div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '8px 12px 14px',
        borderTop: '0.5px solid ' + theme.hairline,
        background: theme.bg,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
        }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: theme.bg2,
            border: '0.5px solid ' + theme.hairlineStrong,
            borderRadius: 22, padding: '0 8px 0 16px', minHeight: 40,
          }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Message"
              style={{
                flex: 1, border: 0, outline: 0, background: 'transparent',
                color: theme.text, fontFamily: 'inherit', fontSize: 15.5,
                letterSpacing: -0.2, padding: '10px 4px',
              }}/>
            <button onClick={send} disabled={!input.trim()} style={{
              appearance: 'none', border: 0, cursor: input.trim() ? 'pointer' : 'default',
              width: 28, height: 28, borderRadius: 14,
              background: input.trim() ? theme.accent : theme.hairlineStrong,
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VoiceCallScreen, TextChatScreen });
