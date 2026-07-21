import type { Metadata } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Stand-ins for the proprietary Ogilvy Sans / Ogilvy Serif. To use the real
// brand fonts, swap these for next/font/local with the licensed font files —
// the --font-sans / --font-serif variables are the only integration point.
const sans = Archivo({
  variable: "--font-brand-sans",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-brand-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ogilvy Tools Hub",
  description:
    "One place to discover internal tools, workshops, tips & tricks, and request new tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
