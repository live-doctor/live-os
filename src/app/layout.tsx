import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Homeio",
  description:
    "A self-hosted operating system for managing your infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${interSans.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <AppThemeProvider>
          {children}
          <Toaster />
        </AppThemeProvider>
      </body>
    </html>
  );
}
