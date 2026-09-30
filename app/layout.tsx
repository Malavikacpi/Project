import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Questionnaire for Climate Risk and Resilience Assessment of India’s Power Sector",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
