'use client';

import { useState } from 'react';
import { ACCENT } from '@/lib/theme';

type State = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === 'loading') return;
    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: ACCENT + '14', border: '0.5px solid ' + ACCENT + '40',
        borderRadius: 14, padding: '14px 20px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12l5 5L20 6"/>
        </svg>
        <span style={{ fontSize: 15, color: '#F5F5F7', letterSpacing: -0.2 }}>
          You&apos;re on the list. We&apos;ll reach out when Soularc launches.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: '1 1 220px', minWidth: 0,
          height: 48, padding: '0 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.14)',
          borderRadius: 12, color: '#F5F5F7',
          fontSize: 15, letterSpacing: -0.2, outline: 'none',
          fontFamily: 'var(--font-geist-sans), -apple-system, system-ui',
        }}
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        style={{
          height: 48, padding: '0 22px',
          background: state === 'loading' ? 'rgba(255,255,255,0.2)' : '#fff',
          color: '#0A0A0C', borderRadius: 12, border: 'none',
          fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
          fontFamily: 'var(--font-geist-sans), -apple-system, system-ui',
        }}
      >
        {state === 'loading' ? 'Joining…' : 'Join waitlist'}
      </button>
      {state === 'error' && (
        <p style={{ width: '100%', margin: 0, fontSize: 13, color: '#ff6b6b', letterSpacing: -0.1 }}>
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
