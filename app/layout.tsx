import type { Metadata, Viewport } from "next";
import { Outfit, REM } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
// import { ShiprocketProvider } from "@/components/providers/ShiprocketProvider"; // ← Uncomment to re-enable Shiprocket

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const rem = REM({ subsets: ["latin"], variable: "--font-rem", display: "swap" });

const CartDrawer = dynamic(() => import("@/components/layout/CartDrawer").then((m) => m.CartDrawer), {
  ssr: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.punchraksha.com"),
  title: {
    default: "PunchRaksha | 100% Ayurvedic Medicine for Piles & Constipation",
    template: "%s",
  },
  description:
    "PunchRaksha offers scientifically-developed 100% Ayurvedic medicine for piles, hemorrhoids, constipation & fissures. Natural herbal formula. Free expert consultation.",
  keywords: [
    "ayurvedic medicine for piles",
    "piles relief tablet",
    "hemorrhoid treatment",
    "natural piles cure",
    "ayurvedic tablets for constipation",
    "herbal piles tablet",
    "PunchRaksha",
  ],
  authors: [{ name: "PunchRaksha", url: "https://www.punchraksha.com" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.punchraksha.com",
    siteName: "PunchRaksha",
    title: "PunchRaksha | 100% Ayurvedic Medicine for Piles",
    description:
      "Scientifically-developed 100% Ayurvedic medicine for piles, hemorrhoids & constipation. Natural herbal formula. Free expert consultation.",
    images: [
      {
        url: "/brand/punchraksha-logo.webp",
        width: 1200,
        height: 630,
        alt: "PunchRaksha – Ayurvedic Piles Relief Medicine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@punchraksha",
    title: "PunchRaksha | 100% Ayurvedic Medicine for Piles",
    description:
      "Scientifically-developed 100% Ayurvedic medicine for piles, hemorrhoids & constipation. Natural herbal formula. Free expert consultation.",
    images: ["/brand/punchraksha-logo.webp"],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents auto-zoom on input focus in iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${rem.variable} antialiased`}>

        {/* <ShiprocketProvider /> */} {/* ← Uncomment to re-enable Shiprocket script */}
        <header id="global-header" className="fixed top-0 z-[100] w-full flex flex-col bg-white">
          <AnnouncementBar />
          <Navbar />
        </header>
        <main className="min-h-[60vh] pt-[95px] md:pt-[145px] lg:pt-[130px]">{children}</main>
        <Footer />
        <CartDrawer />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
