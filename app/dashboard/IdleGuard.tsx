"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/app/actions/auth";

// Redirect to login after this many milliseconds of no user activity.
const IDLE_MS = 30 * 60 * 1000; // 30 minutes

export default function IdleGuard() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        logout();
      }, IDLE_MS);
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the timer on mount

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
