import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Settle Up",
  description: "Settle Up your Bills Dear!!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className}`}
      >
        <ClerkProvider>
        <ConvexClientProvider>
          <Header />
          <main className="min-h-screen">
            {children}
            <Toaster richColors />
          </main>
        </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
