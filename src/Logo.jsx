import React, { useId } from 'react';

// Logo PromptVault: perisai (vault) + prompt ">_" di atas gradient indigo-ungu-pink.
export default function Logo({ size = 28, rounded = true, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="PromptVault"
    >
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`sh${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx={rounded ? 116 : 0} fill={`url(#bg${id})`} />
      <rect width="512" height="256" rx={rounded ? 116 : 0} fill={`url(#sh${id})`} />
      <path
        d="M256 92 L398 146 V268 C398 348 337 406 256 436 C175 406 114 348 114 268 V146 Z"
        fill="#fff" fillOpacity="0.14" stroke="#fff" strokeWidth="22" strokeLinejoin="round"
      />
      <polyline points="206,212 258,258 206,304" fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="282" y1="306" x2="326" y2="306" stroke="#fff" strokeWidth="26" strokeLinecap="round" />
    </svg>
  );
}
