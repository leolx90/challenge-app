import type { Metadata } from "next";
import "./globals.css";
import FeedbackLink from "./(app)/feedback-link";

export const metadata: Metadata = {
  title: "Challenge Tracker",
  description: "Track challenges with check-ins and payouts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased pb-14">
        {children}
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-gray-50 py-3 text-center">
          <FeedbackLink />
        </footer>
      </body>
    </html>
  );
}
