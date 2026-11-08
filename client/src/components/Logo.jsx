import React from 'react'

export function SolliMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer rounded container in warm dark paper */}
      <rect width="40" height="40" rx="10" fill="#1F191D" stroke="#453027" strokeWidth="1" />
      {/* Speech Crest Border in Ember Orange */}
      <path
        d="M20 9C13.925 9 9 13.385 9 18.8C9 21.845 10.59 24.54 13.088 26.346L12.15 31L16.854 28.284C17.925 28.458 18.945 28.55 20 28.55C26.075 28.55 31 24.165 31 18.8C31 13.385 26.075 9 20 9Z"
        fill="#161316"
        stroke="#FF6D29"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* 5 Calibrated Acoustic Bars */}
      <rect x="14" y="16.5" width="1.8" height="4.5" rx="0.9" fill="#BABABA" />
      <rect x="17" y="14.5" width="1.8" height="8.5" rx="0.9" fill="#FF6D29" />
      <rect x="20" y="12.5" width="1.8" height="12.5" rx="0.9" fill="#FFFFFF" />
      <rect x="23" y="14.5" width="1.8" height="8.5" rx="0.9" fill="#FF6D29" />
      <rect x="26" y="16.5" width="1.8" height="4.5" rx="0.9" fill="#BABABA" />
    </svg>
  )
}

export default function Logo({ size = 32, showSub = true, className = '', onClick }) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <SolliMark size={size} />
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[1.05rem] font-semibold tracking-tight text-white font-sans">Solli</span>
          <span className="text-[0.78rem] font-medium text-[#FF6D29] opacity-90">சொல்லி</span>
        </div>
        {showSub && (
          <span className="text-[0.6875rem] font-medium text-[#BABABA] tracking-normal mt-0.5">
            Multilingual Voice Assistant
          </span>
        )}
      </div>
    </div>
  )
}

