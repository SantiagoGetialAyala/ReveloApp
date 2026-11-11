export function ReveloLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="revelo-brand" aria-label="Revelo Transporte">
      <svg
        className="revelo-brand-mark"
        width="40"
        height="40"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="13" fill="#0b2545" />
        <path d="M8 7h11l9 10h-9L8 7Z" fill="#16a34a" />
        <path d="M16 21h14c8 0 11 8 5 14l-3 3h-9l6-7c2-2 1-4-2-4H14l2-6Z" fill="white" />
        <path d="M5 40c5-9 12-16 24-19 5-1 8 0 10 2-10 0-21 7-29 19H5Z" fill="#2563eb" />
        <path
          d="M9 40c6-7 13-12 20-14"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
      {!compact && (
        <span className="revelo-brand-wordmark">
          <span>REVELO</span>
          <span>TRANSPORTE</span>
        </span>
      )}
    </span>
  );
}
