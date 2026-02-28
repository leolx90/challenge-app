import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
