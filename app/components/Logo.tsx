export default function Logo({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="14" width="3.6" height="7" rx="1.2" fill="currentColor" />
      <rect
        x="9.3"
        y="9.4"
        width="3.6"
        height="11.6"
        rx="1.2"
        fill="currentColor"
      />
      <path
        d="M15.9 20.8 L20.3 6.6"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M17.6 5.6 L21.6 4.4 L21.9 8.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
