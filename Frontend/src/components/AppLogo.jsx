import React from "react";

/**
 * KAMBAM FINANCE Official Brand Logo Icon
 * Clean, prestigious Indian Rupee (₹) Sovereign Emblem with Golden Prosperity Sparkle.
 */
export default function AppLogo({ size = 36, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        borderRadius: Math.round(size * 0.26),
        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
        ...style,
      }}
      aria-label="KAMBAM FINANCE Logo"
    >
      <defs>
        {/* Luxury Emerald to Cyan Gradient */}
        <linearGradient id="kfBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Soft Bevel Highlight */}
        <linearGradient id="kfBevelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>

        {/* Crisp Emblem Drop Shadow */}
        <filter id="kfEmblemShadow" x="-15%" y="-15%" width="130%" height="135%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#022c22" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Modern Rounded Squircle Badge */}
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="url(#kfBrandGrad)" />
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11.5"
        stroke="url(#kfBevelGrad)"
        strokeWidth="1.2"
      />

      {/* Central Rupee Finance Emblem */}
      <g
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#kfEmblemShadow)"
      >
        {/* Top Horizontal Bar */}
        <path d="M14.5 13.5H31" />

        {/* Second Parallel Bar */}
        <path d="M14.5 20H25.5" />

        {/* Spine & Upper Curve */}
        <path d="M20 13.5V20.5C26.5 20.5 26.5 28 20 28H17" />

        {/* Downward Kick Leg */}
        <path d="M19.5 28L30.5 38.5" />
      </g>

      {/* Golden Prosperity Sparkle Accent */}
      <path
        d="M34 8L35 10.5L37.5 11.5L35 12.5L34 15L33 12.5L30.5 11.5L33 10.5Z"
        fill="#fef08a"
        stroke="#f59e0b"
        strokeWidth="0.6"
      />
    </svg>
  );
}
