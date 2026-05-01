export default function LogoChecklist({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="5" width="90" height="90" rx="22" fill="#0a2e56" />
      <rect x="25" y="25" width="50" height="55" rx="4" fill="#f8fafc" />
      <path d="M35 25 V15 H65 V25 Z" fill="#e0f2fe" stroke="#0a2e56" strokeWidth="2" />
      <rect x="40" y="18" width="20" height="4" rx="2" fill="#bae6fd" />
      <path d="M46 38 H54 V54 H46 Z M38 42 H62 V50 H38 Z" fill="#10b981" />
      <path
        d="M32 66 L42 76 L72 46"
        stroke="#f59e0b"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
