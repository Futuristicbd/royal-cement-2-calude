import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frame Studio — Royal Cement",
  description:
    "Upload your photo, apply the campaign frame and download it at full resolution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
