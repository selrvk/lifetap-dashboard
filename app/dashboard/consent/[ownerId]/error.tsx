"use client";

import { ErrorScreen } from "@/app/dashboard/error";

export default function ConsentTimelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message="Failed to load this person's consent timeline. Check your connection and try again." onRetry={reset} />;
}
