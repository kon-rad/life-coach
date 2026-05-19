// app.jsx — Life Coach main app: navigation, tab bar, state.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4f5dff",
  "dark": true,
  "view": "app",
  "tab": "home",
  "timeOfDay": "morning"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#4f5dff', '#2d6a4f', '#4338ca', '#c4b5a0'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = makeTheme(t.dark, t.accent);

  // Scale the iPhone frame to fit the viewport
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const recalc = () => {
      const padY = 24, padX = 24;
      const s = Math.min(
        (window.innerWidth - padX * 2) / 402,
        (window.innerHeight - padY * 2) / 874,
        1,
      );
      setScale(s);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  // ── App state ──
  const [view, setView] = React.useState(t.view); // 'onboarding' | 'app'
  const [onboardingStep, setOnboardingStep] = React.useState(0);
  const [tab, setTab] = React.useState(t.tab);     // 'home' | 'project' | 'calls' | 'profile'
  const [convo, setConvo] = React.useState(null);  // null | 'voice' | 'text'

  // sync tweaks → state when they change externally
  React.useEffect(() => { setView(t.view); }, [t.view]);
  React.useEffect(() => { setTab(t.tab); }, [t.tab]);

  const [state, setState] = React.useState({
    timeOfDay: t.timeOfDay,
    todayScore: 8,
    morningDone: true,
    eveningDone: false,
    pushOn: true,
    actions: [
      { label: 'Draft personal statement intro', hint: '30 minutes, no editing', done: true },
      { label: 'Email Sarah for recommender update', hint: 'Short check-in, no pressure', done: true },
      { label: 'Outline answer to essay question 2', hint: 'Bullets only — no prose yet', done: false },
    ],
  });

  React.useEffect(() => {
    setState((s) => ({ ...s, timeOfDay: t.timeOfDay }));
  }, [t.timeOfDay]);

  // Navigation helpers
  const goToOnboarding = () => { setOnboardingStep(0); setView('onboarding'); setTweak('view', 'onboarding'); };
  const finishOnboarding = () => { setView('app'); setTweak('view', 'app'); };
  const changeTab = (name) => { setTab(name); setTweak('tab', name); };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme.dark
        ? 'radial-gradient(circle at 50% 30%, #1a1a1f 0%, #07070a 60%)'
        : 'radial-gradient(circle at 50% 30%, #ffffff 0%, #e9e9e6 70%)',
      fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <IOSDevice dark={theme.dark}>
        {view === 'onboarding' ? (
          <Onboarding theme={theme} step={onboardingStep}
            setStep={setOnboardingStep} onFinish={finishOnboarding}/>
        ) : (
          <MainApp theme={theme} state={state} setState={setState}
                   tab={tab} setTab={changeTab}
                   openCall={() => setConvo('voice')}
                   openChat={() => setConvo('text')}
                   onSignOut={goToOnboarding}/>
        )}

        {convo === 'voice' && (
          <VoiceCallScreen theme={theme} timeOfDay={state.timeOfDay}
                           onEnd={() => setConvo(null)}/>
        )}
        {convo === 'text' && (
          <TextChatScreen theme={theme} onClose={() => setConvo(null)}/>
        )}
      </IOSDevice>
      </div>

      <TweaksPanel>
        <TweakSection label="Theme">
          <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS}
            onChange={(v) => setTweak('accent', v)}/>
          <TweakToggle label="Dark mode" value={t.dark}
            onChange={(v) => setTweak('dark', v)}/>
        </TweakSection>
        <TweakSection label="Navigation">
          <TweakRadio label="View" value={t.view} options={['onboarding', 'app']}
            onChange={(v) => setTweak('view', v)}/>
          <TweakSelect label="Tab" value={t.tab}
            options={['home', 'project', 'calls', 'profile']}
            onChange={(v) => setTweak('tab', v)}/>
        </TweakSection>
        <TweakSection label="State">
          <TweakRadio label="Time of day" value={t.timeOfDay} options={['morning', 'evening']}
            onChange={(v) => setTweak('timeOfDay', v)}/>
          <TweakButton label="Open voice call" onClick={() => setConvo('voice')}/>
          <TweakButton label="Open text chat" onClick={() => setConvo('text')} secondary/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ── MainApp: tabs + tab bar ─────────────────────────────────────────────────
function MainApp({ theme, state, setState, tab, setTab, openCall, openChat, onSignOut }) {
  const titles = { home: 'Today', project: 'Project', calls: 'Conversations', profile: 'Settings' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>
      <IOSStatusBar dark={theme.dark} />

      {/* Large title (custom — IOSNavBar has back chevron we don't want here) */}
      <div style={{
        padding: '6px 20px 14px', color: theme.text,
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: 32, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1,
        }}>{titles[tab]}</div>
        {tab === 'home' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
            color: theme.textDim,
            background: theme.bg2, border: '0.5px solid ' + theme.hairline,
            padding: '5px 10px', borderRadius: 999,
          }}>
            <Icons.lock size={11} stroke={2.4}/> Private
          </div>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 4 }}>
        {tab === 'home' && <HomeTab theme={theme} state={state} setState={setState}
                                     openCall={openCall} openChat={openChat}/>}
        {tab === 'project' && <ProjectTab theme={theme} state={state}/>}
        {tab === 'calls'   && <CallsTab theme={theme} openCall={openCall} openChat={openChat}/>}
        {tab === 'profile' && <ProfileTab theme={theme} state={state} setState={setState}
                                          onSignOut={onSignOut}/>}
      </div>

      {/* Tab bar */}
      <TabBar theme={theme} tab={tab} setTab={setTab}/>
    </div>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ theme, tab, setTab }) {
  const items = [
    { id: 'home',    label: 'Today',     Icon: Icons.home },
    { id: 'project', label: 'Project',   Icon: Icons.target },
    { id: 'calls',   label: 'Calls',     Icon: Icons.waves },
    { id: 'profile', label: 'Profile',   Icon: Icons.person },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: '8px 16px 30px',
      background: theme.tabBar,
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '0.5px solid ' + theme.tabBarBorder,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    }}>
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
            appearance: 'none', border: 0, background: 'transparent',
            cursor: 'pointer', padding: '6px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: active ? theme.accent : theme.textDim,
            fontFamily: 'inherit',
          }}>
            <it.Icon size={26} stroke={active ? 2 : 1.75}/>
            <div style={{
              fontSize: 10.5, fontWeight: active ? 600 : 500, letterSpacing: -0.1,
            }}>{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { App });
