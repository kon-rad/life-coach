'use client';

import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Icon = ({
  d,
  size = 24,
  stroke = 1.75,
  fill = 'none',
  children,
}: {
  d?: string;
  size?: number;
  stroke?: number;
  fill?: string;
  children?: React.ReactNode;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children || (d ? <path d={d} /> : null)}
  </svg>
);

export const MicIcon = ({ size = 24, stroke = 1.75 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0014 0" />
    <path d="M12 18v3" />
  </Icon>
);

export const CheckIcon = ({ size = 24, stroke = 2.2 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <path d="M4 12l5 5L20 6" />
  </Icon>
);

export const LockIcon = ({ size = 24, stroke = 1.75 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </Icon>
);

export const TargetIcon = ({ size = 24, stroke = 1.75 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const WavesIcon = ({ size = 24, stroke = 1.75 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 2-4" />
  </Icon>
);

export const ChevronRightIcon = ({ size = 18, stroke = 2 }: IconProps) => (
  <Icon size={size} stroke={stroke}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const AppleIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16.5 12.5c0-2.6 2.1-3.9 2.2-3.9-1.2-1.7-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.7-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-3.7zM14 4.5c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.5-.7.8-1.3 2-1.1 3.2 1.1.1 2.2-.5 3-1.4z" />
  </svg>
);

export const SpeakerIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M16 9a5 5 0 010 6" />
  </svg>
);
