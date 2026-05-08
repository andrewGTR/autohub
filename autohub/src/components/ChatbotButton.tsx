"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChatbotButton() {
  const pathname = usePathname();

  // Don't show the floating button if we're already on the AI page
  if (pathname === "/ai") {
    return null;
  }

  return (
    <Link href="/ai" className="chatbot-btn" title="Open Turbo Bot AI">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h1a7 7 0 0 1 7 7v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1a7 7 0 0 1 7-7h1V5.72A2 2 0 0 1 10 4a2 2 0 0 1 2-2zm-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM7 20h10v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1z" />
      </svg>
    </Link>
  );
}
