"use client";

import { ErrorScreen } from "@/app/dashboard/error";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message="Failed to load reports. Check your connection and try again." onRetry={reset} />;
}
