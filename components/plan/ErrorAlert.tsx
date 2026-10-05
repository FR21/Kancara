import { CircleAlert, RotateCcw } from "lucide-react";

type ErrorAlertProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

export default function ErrorAlert({ message, retryLabel, onRetry }: ErrorAlertProps) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-error-subtle px-4 py-3 text-left">
      <CircleAlert className="size-5 shrink-0 text-error" aria-hidden="true" />
      <p className="min-w-0 flex-1 basis-48 text-body-sm text-on-error-subtle">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-error px-4 text-label text-on-error transition-[scale] duration-150 ease-out active:scale-[0.97]"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {retryLabel}
      </button>
    </div>
  );
}
