import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "./components/Sidebar";
import ThemeProvider from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";
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
  title: "Finanças",
  description: "Controle de transações financeiras",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Sidebar />
          <div className="flex min-h-screen flex-col pl-64">
            <header className="flex items-center justify-end border-b border-border px-8 py-4">
              <ThemeToggle />
            </header>
            <main className="flex-1 px-8 py-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
