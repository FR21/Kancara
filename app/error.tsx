"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState type="500" onRetry={retry} />;
}
