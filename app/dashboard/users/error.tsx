"use client";

import { ErrorScreen } from "@/app/dashboard/error";

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message="Failed to load user records. Check your connection and try again." onRetry={reset} />;
}
