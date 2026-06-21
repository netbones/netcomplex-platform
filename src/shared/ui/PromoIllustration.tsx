export function PromoIllustration() {
  return (
    <svg
      width="140"
      height="72"
      viewBox="0 0 140 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Stacked cards, fanned back to front */}
      <g transform="rotate(-14 30 36)">
        <rect x="6" y="14" width="46" height="34" rx="6" fill="#C4B5FD" />
        <rect x="14" y="22" width="22" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="14" y="29" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      </g>
      <g transform="rotate(-6 34 36)">
        <rect x="16" y="10" width="46" height="34" rx="6" fill="#A7D8F0" />
        <rect x="24" y="18" width="22" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="24" y="25" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      </g>
      <g transform="rotate(4 40 36)">
        <rect x="26" y="8" width="46" height="34" rx="6" fill="#A7E0C4" />
        <rect x="34" y="16" width="22" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="34" y="23" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      </g>
      <g transform="rotate(12 46 36)">
        <rect x="38" y="6" width="46" height="34" rx="6" fill="#F2C6DE" />
        <rect x="46" y="14" width="22" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="46" y="21" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      </g>

      {/* Mascot */}
      <g transform="translate(86 14)">
        {/* legs */}
        <path d="M14 44 L10 58" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 44 L30 58" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
        {/* arms */}
        <path
          d="M4 26 C -6 26, -6 36, 0 38"
          stroke="#0F766E"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M36 26 C 46 26, 46 36, 40 38"
          stroke="#0F766E"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* body */}
        <rect x="4" y="4" width="32" height="40" rx="10" fill="#2DD4BF" />
        {/* face */}
        <circle cx="14" cy="22" r="2.2" fill="#0F172A" />
        <circle cx="26" cy="22" r="2.2" fill="#0F172A" />
        <path
          d="M13 30 Q20 36 27 30"
          stroke="#0F172A"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
