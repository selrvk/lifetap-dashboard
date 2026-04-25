"use client";

import { ErrorScreen } from "@/app/dashboard/error";

export default function PersonnelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message="Failed to load personnel records. Check your connection and try again." onRetry={reset} />;
}
