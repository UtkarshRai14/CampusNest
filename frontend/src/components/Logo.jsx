export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      
      <path d="M4 28 Q24 42 44 28" stroke="url(#grad)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M8 24 Q24 36 40 24" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M12 20 Q24 30 36 20" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      
      <rect x="18" y="8" width="12" height="3" rx="1" fill="url(#grad)"/>
      <polygon points="24,4 32,8 24,12 16,8" fill="url(#grad)"/>
      <line x1="32" y1="8" x2="32" y2="13" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="14" r="1.5" fill="#00C9B1"/>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00C9B1"/>
          <stop offset="100%" stopColor="#00A8E8"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
