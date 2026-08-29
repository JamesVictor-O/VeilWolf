import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeilWolf",
  description: "A hidden-role social deduction game built on Midnight Network.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
