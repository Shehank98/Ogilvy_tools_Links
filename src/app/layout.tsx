import type { Metadata, Viewport } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

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
  manifest: "/manifest.webmanifest",
  applicationName: "Ogilvy Tools Hub",
  appleWebApp: {
    capable: true,
    title: "Tools Hub",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ee3124",
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
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
