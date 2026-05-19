// waveform.jsx — Animated voice waveform components.
//
// <ScoreWave>      — small static decorative wave under the daily score
// <BigWaveform>    — large reactive waveform for the voice call screen

// Small wave under score number — subtle 2-line sin curve, static
function ScoreWave({ color, width = 240, height = 36, intensity = 1 }) {
  const path = React.useMemo(() => {
    const points = 60;
    const path1 = [];
    const path2 = [];
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const t = i / points;
      const y1 = height / 2 + Math.sin(t * Math.PI * 4.2) * 6 * intensity
                  + Math.sin(t * Math.PI * 1.5) * 4 * intensity;
      const y2 = height / 2 + Math.sin(t * Math.PI * 3.7 + 1.2) * 4 * intensity
                  + Math.cos(t * Math.PI * 2.3) * 3 * intensity;
      path1.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y1.toFixed(1)}`);
      path2.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y2.toFixed(1)}`);
    }
    return { p1: path1.join(' '), p2: path2.join(' ') };
  }, [width, height, intensity]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={path.p1} fill="none" stroke={color} strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round"/>
      <path d={path.p2} fill="none" stroke={color} strokeOpacity="0.32" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Large reactive waveform — for full-screen voice call. Two stacked smooth
// paths animated via requestAnimationFrame. `active=false` shows a calm
// resting wave; `active=true` shows a bigger, faster reactive wave.
function BigWaveform({ color, width = 380, height = 200, active = true, listening = false }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setTick((t) => t + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const amp = active ? (listening ? 1.0 : 0.55) : 0.25;
  const speed = active ? (listening ? 2.6 : 1.6) : 0.8;

  const build = (phase, freq, ampMul) => {
    const points = 80;
    const parts = [];
    const cy = height / 2;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const t = i / points;
      // Envelope — fade to zero at edges
      const env = Math.sin(t * Math.PI);
      const a = amp * ampMul * env * 40;
      const y = cy
        + Math.sin(t * Math.PI * freq + tick * speed + phase) * a
        + Math.sin(t * Math.PI * (freq * 1.7) + tick * speed * 1.4 + phase) * a * 0.45
        + Math.sin(t * Math.PI * (freq * 0.6) + tick * speed * 0.6) * a * 0.3;
      parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(2)}`);
    }
    return parts.join(' ');
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="wf-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0"/>
          <stop offset="0.18" stopColor={color} stopOpacity="1"/>
          <stop offset="0.82" stopColor={color} stopOpacity="1"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* back layer — softer, slower */}
      <path d={build(0, 4.2, 0.6)} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round"/>
      <path d={build(1.4, 3.6, 0.75)} fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round"/>
      {/* main layer */}
      <path d={build(0.7, 5.1, 1)} fill="none" stroke="url(#wf-fade)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

Object.assign(window, { ScoreWave, BigWaveform });
