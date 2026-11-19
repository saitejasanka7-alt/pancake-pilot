import React from 'react';

export function PancakePilotLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="48" height="48" rx="13" fill="#101426" />
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="12"
        stroke="url(#pp_border)"
        strokeWidth="1.5"
      />
      {/* Stacked pancakes */}
      <ellipse
        cx="24"
        cy="33.5"
        rx="13.5"
        ry="4"
        fill="#8156F8"
        fillOpacity="0.28"
        stroke="#A46BFF"
        strokeWidth="1.6"
      />
      <ellipse
        cx="24"
        cy="28"
        rx="12"
        ry="3.6"
        fill="#151B30"
        stroke="#A46BFF"
        strokeWidth="1.6"
      />
      <ellipse
        cx="24"
        cy="22.5"
        rx="10.5"
        ry="3.2"
        fill="#151B30"
        stroke="#43D9E8"
        strokeWidth="1.6"
      />
      {/* AI compass sparkle */}
      <path
        d="M24 8.5L26.4 14.6L32.5 17L26.4 19.4L24 25.5L21.6 19.4L15.5 17L21.6 14.6L24 8.5Z"
        fill="url(#pp_spark)"
      />
      <defs>
        <linearGradient id="pp_border" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A46BFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#43D9E8" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="pp_spark" x1="15.5" y1="8.5" x2="32.5" y2="25.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#43D9E8" />
          <stop offset="1" stopColor="#A46BFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PipOrb({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-20 h-20' : size === 'md' ? 'w-12 h-12' : 'w-9 h-9';
  return (
    <div
      className={`relative ${dim} rounded-full flex items-center justify-center pip-orb-float shrink-0`}
      style={{
        background:
          'radial-gradient(circle at 32% 30%, #43D9E8 0%, #A46BFF 48%, #341E72 100%)',
        boxShadow: '0 0 28px rgba(164, 107, 255, 0.35), inset 0 0 14px rgba(67, 217, 232, 0.45)',
      }}
      aria-hidden="true"
    >
      <div className="w-[62%] h-[62%] rounded-full border border-white/30 flex items-center justify-center bg-[#080B16]/25 backdrop-blur-sm">
        <svg className="w-1/2 h-1/2 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z" />
        </svg>
      </div>
    </div>
  );
}
