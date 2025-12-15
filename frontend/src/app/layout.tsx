import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import NeuralBackground from '../components/NeuralBackground'; // Import the new one

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Codex",
  description: "AI Video Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-black text-white antialiased`}>
            {/* The Canvas sits behind everything */}
            <NeuralBackground />
            {/* Main Content sits on top */}
            <div className="relative z-10">
                {children}
            </div>
        </body>
      </html>
    </ClerkProvider>
  );
}