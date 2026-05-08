import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { PostsProvider } from "../context/PostsContext";
import { SavedCarsProvider } from "../context/SavedCarsContext";
import ChatbotButton from "../components/ChatbotButton";
import "./globals.css";

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Hub",
  description: "Discover Your Car Intelligently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={alexandria.variable}>
      <body>
        <AuthProvider>
          <PostsProvider>
            <SavedCarsProvider>
              {children}
              <ChatbotButton />
            </SavedCarsProvider>
          </PostsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
