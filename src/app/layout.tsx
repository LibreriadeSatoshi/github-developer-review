import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import { DebugAuth } from "@/components/DebugAuth";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Developer Review",
  description: "Evaluate Bitcoin open-source contributors for grant funding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const debugEnabled = process.env.DEBUG_CONSOLE === "TRUE";

  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${geistMono.variable} font-sans antialiased container bg-bg-black text-foreground`}
      >
        <DebugAuth enabled={debugEnabled} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
