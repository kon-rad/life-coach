// landing-app.jsx — Composes the landing page sections.

function LandingApp() {
  const theme = makeTheme(true, ACCENT);

  // Mobile: stack everything to a single column on narrow viewports.
  // Inject responsive styles once.
  React.useEffect(() => {
    if (document.getElementById('__landing-responsive')) return;
    const s = document.createElement('style');
    s.id = '__landing-responsive';
    s.textContent = `
      html { scroll-behavior: smooth; }
      body { background: #07070a; color: #F5F5F7;
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        margin: 0; -webkit-font-smoothing: antialiased;
      }
      a { color: inherit; }
      ::selection { background: ${ACCENT}55; color: #fff; }

      @media (max-width: 900px) {
        nav > div { padding: 12px 20px !important; }
        nav a[href="#how"], nav a[href="#privacy"] { display: none !important; }
        section[id], section { padding-left: 0 !important; padding-right: 0 !important; }
        section > section, section > div[style*="max-width"] { padding-left: 20px !important; padding-right: 20px !important; }
        /* Stack all 2-column grids */
        [data-stack-on-mobile] { grid-template-columns: 1fr !important; gap: 40px !important; padding: 36px 24px !important; }
        h1 { font-size: 44px !important; letter-spacing: -1.4px !important; }
        h2 { font-size: 36px !important; letter-spacing: -1.2px !important; }
        h3 { font-size: 28px !important; letter-spacing: -0.8px !important; }
        [data-showcase-grid] { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
        [data-steps-grid] { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 540px) {
        [data-showcase-grid] { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <div style={{ background: '#07070a', color: '#F5F5F7', minHeight: '100vh', overflow: 'hidden' }}>
      <TopNav/>
      <Hero theme={theme}/>
      <HowItWorks theme={theme}/>
      <PrivacySection/>
      <Showcase theme={theme}/>
      <WhoItsFor/>
      <FinalCTA/>
      <Footer/>
    </div>
  );
}

Object.assign(window, { LandingApp });
