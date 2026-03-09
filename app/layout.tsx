import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Temukan Ijazah Asli Jokowi!",
  description:
    "Ratusan dokumen terus bergerak — temukan satu dokumen asli yang tersembunyi! Kumpulkan item langka, epic, hingga legendaris. Bisakah kamu menemukannya?",
  keywords: [
    "temukan ijazah asli jokowi",
    "game amplop",
    "game Indonesia",
    "klik amplop",
    "game seru",
    "item langka",
    "mini game",
  ],
  authors: [{ name: "Temukan Ijazah Asli Jokowi" }],
  openGraph: {
    title: "Temukan Ijazah Asli Jokowi!",
    description:
      "Ratusan dokumen terus bergerak — temukan satu dokumen asli yang tersembunyi! Kumpulkan item langka, epic, hingga legendaris.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Temukan Ijazah Asli Jokowi!",
    description:
      "Ratusan amplop terus bergerak — temukan satu dokumen asli yang tersembunyi! Bisakah kamu menemukannya?",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}