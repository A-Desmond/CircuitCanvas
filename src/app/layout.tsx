import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CircuitCanvas",
  description: "An agent-native beginner electronics workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={openSans.variable}>{children}</body>
    </html>
  );
}
