import type { Metadata, Viewport } from "next";
import { Anton, Manrope, Space_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-manrope", display: "optional" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "optional" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = `${profile.name} · Networking, Cloud, DevOps & ML`;
const description = `${profile.tagline} Portfolio of ${profile.name}, B.Tech Information Science & Engineering at NMAMIT (2027): projects, internships, certificates and skills.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "Siddhartha Chathra B S · Portfolio",
  authors: [{ name: profile.name, url: profile.links.linkedin }],
  keywords: [
    "Siddhartha Chathra B S",
    "network engineer",
    "cloud",
    "DevOps",
    "machine learning",
    "NMAMIT",
    "portfolio",
    "NetSentinel",
    "JobSentinel",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    title,
    description,
    url: "/",
    siteName: profile.name,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFE3D3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  email: `mailto:${profile.links.email}`,
  url: SITE_URL,
  sameAs: [profile.links.linkedin, profile.links.github],
  alumniOf: { "@type": "CollegeOrUniversity", name: profile.education.school },
  knowsAbout: ["Computer Networks", "Cloud Computing", "DevOps", "Machine Learning", "Data Analysis"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${manrope.variable} ${spaceMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
