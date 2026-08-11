import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Climate Risk & Resilience Questionnaire",
  description: "Climate risk assessment for India’s power distribution systems",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
