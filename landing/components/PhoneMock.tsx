'use client';

import React from 'react';
import { theme, scoreColor, ACCENT } from '@/lib/theme';
import { ScoreWave, BigWaveform } from './Waveform';

// ── iOS Status Bar ─────────────────────────────────────────────────────────
function IOSStatusBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px 0', boxSizing: 'border-box',
      position: 'relative', zIndex: 20, width: '100%',
    }}>
      <span style={{
        fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 590,
        fontSize: 15, color: '#fff',
      }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="#fff"/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="#fff"/>
          <circle cx="8.5" cy="10.5" r="1.5" fill="#fff"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="#fff"/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="#fff"/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="#fff"/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="#fff"/>
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#fff" strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill="#fff"/>
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="#fff" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ── iOS Device Frame ───────────────────────────────────────────────────────
function IOSDevice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 402, height: 874, borderRadius: 48, overflow: 'hidden',
      position: 'relative', background: '#000',
      boxShadow: '0 40px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000',
        zIndex: 50, boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
      }}/>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <IOSStatusBar/>
      </div>
      <div style={{ height: '100%' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        paddingBottom: 8, pointerEvents: 'none',
      }}>
        <div style={{
          width: 139, height: 5, borderRadius: 100,
          background: 'rgba(255,255,255,0.6)',
        }}/>
      </div>
    </div>
  );
}

// ── Scaled phone wrapper ───────────────────────────────────────────────────
export function PhoneMock({ children, scale = 0.62 }: { children: React.ReactNode; scale?: number }) {
  return (
    <div style={{
      width: 402 * scale, height: 874 * scale,
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        transform: `scale(${scale})`, transformOrigin: 'top left',
        width: 402, height: 874,
      }}>
        <IOSDevice>{children}</IOSDevice>
      </div>
    </div>
  );
}

// ── Tab bar icons ──────────────────────────────────────────────────────────
function TabBarIcon({ kind, color }: { kind: string; color: string }) {
  if (kind === 'home') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
  if (kind === 'target') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
  if (kind === 'waveform') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/>
    </svg>
  );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

// ── Bottom tab bar ─────────────────────────────────────────────────────────
function TabBar({ active }: { active: 'today' | 'tasks' | 'calls' | 'profile' }) {
  const tabs = [
    { id: 'today',   label: 'Today',   icon: 'home' },
    { id: 'tasks',   label: 'Tasks',   icon: 'target' },
    { id: 'calls',   label: 'Calls',   icon: 'waveform' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ] as const;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      height: 83, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
      padding: '10px 0 0',
      background: theme.tabBar,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid ' + theme.tabBarBorder,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        const color = isActive ? ACCENT : theme.textFaint;
        return (
          <div key={tab.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color, minWidth: 64,
          }}>
            <TabBarIcon kind={tab.icon} color={color}/>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: 0 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Home screen mock ───────────────────────────────────────────────────────
export function MockHome() {
  const scoreColor_ = theme.ok;
  return (
    <div style={{
      padding: '58px 16px 0', height: '100%',
      background: theme.bg, color: theme.text,
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* "Today" nav title + PRIVATE badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px 2px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Today</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
          color: theme.textFaint,
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          padding: '5px 10px', borderRadius: 999,
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2"/>
            <path d="M8 11V8a4 4 0 018 0v3"/>
          </svg>
          Private
        </div>
      </div>

      {/* Date + greeting */}
      <div style={{ padding: '0 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint, marginBottom: 4 }}>Wednesday, May 14</div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.7, lineHeight: 1.1 }}>Good morning.</div>
        <div style={{ fontSize: 14, color: theme.textDim, marginTop: 2, letterSpacing: -0.2 }}>Ready when you are.</div>
      </div>

      {/* Score card */}
      <div style={{
        background: theme.bg2, borderRadius: 20,
        border: '0.5px solid ' + theme.hairline, padding: '14px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint }}>Yesterday&apos;s score</div>
          <div style={{ fontSize: 10.5, color: theme.textFaint }}>May 13</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 66, fontWeight: 500, color: scoreColor_,
            letterSpacing: -3, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
          }}>8</div>
          <div style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 22, color: theme.textFaint, fontWeight: 400,
            letterSpacing: -0.8, paddingBottom: 7,
          }}>/10</div>
          <div style={{ flex: 1 }}/>
          <div style={{
            fontSize: 11, color: theme.textDim, paddingBottom: 10,
            textAlign: 'right', maxWidth: 110, lineHeight: 1.3,
          }}>You shipped the intro draft. Real momentum.</div>
        </div>
        <div style={{ marginTop: 2 }}>
          <ScoreWave color={scoreColor_} width={300} height={26} intensity={0.85}/>
        </div>
      </div>

      {/* Midday check-in complete */}
      <div style={{
        background: theme.bg2, borderRadius: 20,
        border: '0.5px solid ' + theme.hairline,
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.textDim} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2 }}>Midday check-in complete</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 1 }}>Evening debrief at 8 pm.</div>
        </div>
      </div>

      {/* This week's tasks */}
      <div style={{
        background: theme.bg2, borderRadius: 20,
        border: '0.5px solid ' + theme.hairline, padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint }}>This week</div>
          <div style={{ fontSize: 10.5, color: theme.textFaint, fontVariantNumeric: 'tabular-nums' }}>1/3</div>
        </div>
        {[
          { t: 'Finish personal statement draft', done: true },
          { t: 'Lock in two recommenders', done: false },
          { t: 'Complete essay question 2', done: false },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '8px 0',
            borderBottom: i < 2 ? '0.5px solid ' + theme.hairline : 'none',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              border: '1.5px solid ' + (a.done ? ACCENT : theme.hairlineStrong),
              background: a.done ? ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {a.done && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 500, letterSpacing: -0.2, color: theme.text,
              textDecoration: a.done ? 'line-through' : 'none', opacity: a.done ? 0.5 : 1,
            }}>{a.t}</div>
          </div>
        ))}
      </div>

      {/* Today's tasks */}
      <div style={{
        background: theme.bg2, borderRadius: 20,
        border: '0.5px solid ' + theme.hairline, padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.textFaint }}>Today</div>
          <div style={{ fontSize: 10.5, color: theme.textFaint, fontVariantNumeric: 'tabular-nums' }}>2/3</div>
        </div>
        {[
          { t: 'Draft personal statement intro', done: true },
          { t: 'Email Sarah for recommender update', done: true },
          { t: 'Outline essay question 2 bullets', done: false },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '8px 0',
            borderBottom: i < 2 ? '0.5px solid ' + theme.hairline : 'none',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              border: '1.5px solid ' + (a.done ? ACCENT : theme.hairlineStrong),
              background: a.done ? ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {a.done && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 500, letterSpacing: -0.2, color: theme.text,
              textDecoration: a.done ? 'line-through' : 'none', opacity: a.done ? 0.5 : 1,
            }}>{a.t}</div>
          </div>
        ))}
      </div>

      <TabBar active="today"/>
    </div>
  );
}

// ── Voice call mock ────────────────────────────────────────────────────────
export function MockCall({ listening = true }: { listening?: boolean }) {
  return (
    <div style={{
      height: '100%', background: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 50% 45%, ${ACCENT}33, transparent 55%)`,
      }}/>
      <div style={{ position: 'relative', paddingTop: 50, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Midday Check-in</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>Life Coach</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>0:02</div>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1,
      }}>
        <BigWaveform color={ACCENT} width={340} height={180} active={true} listening={listening}/>
        <div style={{
          marginTop: 16, fontSize: 11, fontWeight: 500, letterSpacing: 1.6,
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: '#34c759', display: 'inline-block' }}/>
          Listening
        </div>
        <div style={{
          marginTop: 28, maxWidth: 280, textAlign: 'center',
          fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.35, letterSpacing: -0.3,
        }}>
          How's progress on today&apos;s tasks?
        </div>
      </div>
      {/* Controls */}
      <div style={{
        padding: '16px 36px 56px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/>
              <path d="M5 11a7 7 0 0014 0"/>
              <path d="M12 18v3"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Mute</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 30,
            background: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255,69,58,0.4)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M21 12c-1.5-1.4-3.5-2.3-5.5-2.7l-.4 2.1c-.3 1.6-.6 1.9-2.2 1.9h-1.8c-1.6 0-1.9-.3-2.2-1.9l-.4-2.1c-2 .4-4 1.3-5.5 2.7l3.1 3.1c1 1 1.7 1 2.7 0l1.3-1.3c.4-.4.9-.4 1.4 0l1.3 1.3c1 1 1.7 1 2.7 0L21 12z"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0)' }}>—</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M16 9a5 5 0 010 6"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Speaker</span>
        </div>
      </div>
    </div>
  );
}

// ── Tasks tab mock ─────────────────────────────────────────────────────────
export function MockProject() {
  const weekTasks = [
    { t: 'Finish personal statement draft', done: true },
    { t: 'Lock in two recommenders', done: false },
    { t: 'Complete essay question 2', done: false },
  ];
  const days = [
    { d: 'Today · Wed', score: null, expanded: true, tasks: [
      { t: 'Draft personal statement intro', done: true },
      { t: 'Email Sarah for recommender update', done: true },
      { t: 'Outline essay question 2 bullets', done: false },
    ]},
    { d: 'Tue May 13', score: 8, expanded: false, tasks: [] },
    { d: 'Mon May 12', score: 7, expanded: false, tasks: [] },
  ];
  return (
    <div style={{
      padding: '58px 16px 83px', background: theme.bg, color: theme.text,
      height: '100%', display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 4px 4px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>Tasks</div>
      </div>

      {/* Current week card */}
      <div style={{ background: theme.bg2, borderRadius: 16, border: '0.5px solid ' + theme.hairline, overflow: 'hidden' }}>
        <div style={{ padding: '10px 13px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>Week 20</div>
          <div style={{ fontSize: 10.5, color: theme.textFaint }}>May 12–18 · 1/3</div>
        </div>
        {weekTasks.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 13px',
            borderTop: '0.5px solid ' + theme.hairline,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9,
              border: '1.5px solid ' + (a.done ? ACCENT : theme.hairlineStrong),
              background: a.done ? ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {a.done && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 500, letterSpacing: -0.1, color: theme.text,
              textDecoration: a.done ? 'line-through' : 'none', opacity: a.done ? 0.5 : 1,
            }}>{a.t}</div>
          </div>
        ))}
      </div>

      {/* Day rows */}
      {days.map((day, di) => (
        <div key={di} style={{ background: theme.bg2, borderRadius: 16, border: '0.5px solid ' + theme.hairline, overflow: 'hidden' }}>
          <div style={{ padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: -0.2 }}>{day.d}</div>
            {day.score !== null ? (
              <div style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 13, fontWeight: 600, color: scoreColor(day.score),
              }}>{day.score}/10</div>
            ) : (
              <div style={{ fontSize: 10.5, color: theme.textFaint }}>2/3 done</div>
            )}
          </div>
          {day.expanded && day.tasks.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 13px',
              borderTop: '0.5px solid ' + theme.hairline,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 9,
                border: '1.5px solid ' + (a.done ? ACCENT : theme.hairlineStrong),
                background: a.done ? ACCENT : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {a.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6"/>
                  </svg>
                )}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 500, letterSpacing: -0.1, color: theme.text,
                textDecoration: a.done ? 'line-through' : 'none', opacity: a.done ? 0.5 : 1,
              }}>{a.t}</div>
            </div>
          ))}
        </div>
      ))}

      <TabBar active="tasks"/>
    </div>
  );
}

// ── Conversations mock ─────────────────────────────────────────────────────
export function MockConversations() {
  const conversations = [
    { type: 'voice', title: 'Midday check-in', date: 'Today',     preview: 'Progress on tasks; flagged blocker on essay Q2...', meta: '3 min · midday' },
    { type: 'text',  title: 'Text chat',       date: 'Yesterday', preview: 'Worked through doubts about the personal...', meta: '14 messages' },
    { type: 'voice', title: 'Evening debrief', date: 'Yesterday', preview: 'Reflected on strong day. Score 8.', meta: '5 min · evening' },
    { type: 'voice', title: 'Midday check-in', date: 'May 12',    preview: 'Recommender follow-up still on track.', meta: '3 min · midday' },
    { type: 'text',  title: 'Text chat',       date: 'May 11',    preview: 'Quick brainstorm on essay question 2 angle.', meta: '8 messages' },
    { type: 'voice', title: 'Evening debrief', date: 'May 11',    preview: 'Acknowledged slow day. Reset for tomorrow.', meta: '5 min · evening' },
    { type: 'voice', title: 'Weekly planning', date: 'May 10',    preview: 'Set 3 week tasks; retro on last week.', meta: '6 min · weekly' },
  ];
  return (
    <div style={{
      padding: '58px 0 83px', background: theme.bg, color: theme.text,
      height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Conversations</div>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {conversations.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 16px',
            borderBottom: '0.5px solid ' + theme.hairline,
          }}>
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: ACCENT + '1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c.type === 'voice' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              )}
            </div>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: theme.textFaint, whiteSpace: 'nowrap', marginLeft: 8 }}>{c.date}</div>
              </div>
              <div style={{ fontSize: 12, color: theme.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>{c.preview}</div>
              <div style={{ fontSize: 10.5, color: theme.textFaint, marginTop: 2 }}>{c.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <div style={{
        position: 'absolute', bottom: 96, right: 16,
        width: 48, height: 48, borderRadius: 24,
        background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px ' + ACCENT + '55',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>

      <TabBar active="calls"/>
    </div>
  );
}

// ── Chat mock (kept for backward compat) ───────────────────────────────────
export function MockChat() {
  const msgs = [
    { from: 'ai', text: 'Good morning. How are you feeling about today?' },
    { from: 'me', text: 'A bit scattered. I have a lot on my plate.' },
    { from: 'ai', text: "Worth slowing down for. What's the one thing that would matter most if you moved it forward?" },
    { from: 'me', text: "The personal statement. I've been avoiding it." },
    { from: 'ai', text: "Let's start there. Forget polish. What's the first true sentence you could write?" },
  ];
  return (
    <div style={{ background: theme.bg, color: theme.text, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingTop: 50, paddingBottom: 12, textAlign: 'center', borderBottom: '0.5px solid ' + theme.hairline }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Life Coach</div>
        <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: '#34c759', display: 'inline-block' }}/>Online
        </div>
      </div>
      <div style={{ flex: 1, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {msgs.map((m, i) => {
          const isLast = i === msgs.length - 1 || msgs[i + 1]?.from !== m.from;
          const mine = m.from === 'me';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: isLast ? 6 : 0 }}>
              <div style={{
                maxWidth: '78%', padding: '8px 12px',
                borderRadius: 17,
                borderBottomRightRadius: mine && isLast ? 5 : 17,
                borderBottomLeftRadius: !mine && isLast ? 5 : 17,
                background: mine ? ACCENT : theme.bg2,
                color: mine ? '#fff' : theme.text,
                fontSize: 13.5, lineHeight: 1.4, letterSpacing: -0.1,
                border: mine ? 'none' : '0.5px solid ' + theme.hairline,
              }}>{m.text}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 12px 24px', borderTop: '0.5px solid ' + theme.hairline }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: theme.bg2, border: '0.5px solid ' + theme.hairlineStrong,
          borderRadius: 18, padding: '0 6px 0 14px', minHeight: 34,
        }}>
          <div style={{ flex: 1, color: theme.textFaint, fontSize: 13.5, padding: '6px 0' }}>Message</div>
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            background: theme.hairlineStrong, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
