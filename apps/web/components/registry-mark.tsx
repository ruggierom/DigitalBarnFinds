type RegistryMarkProps = {
  className?: string;
};

export function RegistryMark({ className }: RegistryMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="14" y="14" width="92" height="92" rx="28" fill="currentColor" fillOpacity="0.06" />
      <rect x="14" y="14" width="92" height="92" rx="28" stroke="currentColor" strokeWidth="5" />
      <path
        d="M38 84V36h20c8.2 0 14.2 1.7 18 5.2 3.8 3.5 5.7 8.4 5.7 14.6 0 6.6-2 11.7-6 15.2-4 3.4-10 5.1-18 5.1H49.4V84H38Zm11.4-18.1h8.8c7.9 0 11.8-3.3 11.8-9.9 0-6.5-3.9-9.8-11.8-9.8h-8.8v19.7Z"
        fill="currentColor"
      />
      <circle cx="84" cy="84" r="9" fill="currentColor" />
    </svg>
  );
}
