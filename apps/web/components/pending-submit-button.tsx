"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className = "button",
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button aria-busy={pending} className={className} disabled={pending} type="submit">
      <span className="button__label-row">
        <span>{pending ? pendingLabel : idleLabel}</span>
        {pending ? <span aria-hidden="true" className="button__spinner" /> : null}
      </span>
    </button>
  );
}
