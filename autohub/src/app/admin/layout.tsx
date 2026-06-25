import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auto Hub – Admin Dashboard",
  description: "AutoHub Admin Panel – manage car posts, users, and explorer vehicles.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin pages render WITHOUT the main site's PageNavbar and ChatbotButton.
  // The AuthProvider / PostsProvider / SavedCarsProvider from the root layout
  // still wrap this layout, so useAuth() works inside admin pages.
  return <>{children}</>;
}
