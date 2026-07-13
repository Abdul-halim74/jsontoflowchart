import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSON to Flowchart",
  description: "Convert nested JSON into an interactive architecture diagram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
