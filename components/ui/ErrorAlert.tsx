import { CircleAlert, RotateCw } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

type ErrorAlertProps = {
  message: string;
  /** Both left out where the way to try again is already on screen, such as a form's own Save button. */
  retryLabel?: string;
  onRetry?: () => void;
};

export default function ErrorAlert({ message, retryLabel, onRetry }: ErrorAlertProps) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 surface-compact rounded-surface bg-error-subtle p-surface text-left">
      <CircleAlert className="size-5 shrink-0 text-error" aria-hidden="true" />
      <p className="min-w-0 flex-1 basis-48 text-body-sm text-on-error-subtle">{message}</p>
      {retryLabel && onRetry && (
        <button type="button" onClick={onRetry} className={buttonClass("outline", "small")}>
          <RotateCw className="size-4" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
