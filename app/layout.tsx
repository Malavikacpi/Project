import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Climate Risk and Resilience Assessment of Power Sector Assets",
  description: "Climate risk and resilience assessment for India’s power sector assets",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
