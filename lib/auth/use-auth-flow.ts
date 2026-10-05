"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMessages } from "@/lib/use-messages";
import { type AuthErrorKey, authErrorCode, authErrorKey } from "./client";

export function useAuthFlow() {
  const text = useMessages("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<string | null>): Promise<AuthErrorKey | null> => {
    setPending(true);
    setError("");
    try {
      const destination = await action();
      if (!destination) {
        setError(text.errors.default);
        return "default";
      }
      router.push(destination);
      router.refresh();
      return null;
    } catch (caught) {
      console.error("Auth request failed:", authErrorCode(caught));
      const key = authErrorKey(caught);
      if (key) setError(text.errors[key]);
      return key;
    } finally {
      setPending(false);
    }
  };

  return { pending, error, run };
}
