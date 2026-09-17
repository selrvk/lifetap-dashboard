"use client";

import { ErrorScreen } from "@/app/dashboard/error";

export default function ConsentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message="Failed to load consent history. Check your connection and try again." onRetry={reset} />;
}
