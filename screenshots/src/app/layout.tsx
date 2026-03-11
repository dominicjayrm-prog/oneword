import localFont from "next/font/local";
import "./globals.css";

const playfair = localFont({
  src: [
    { path: "../fonts/PlayfairDisplay_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/PlayfairDisplay_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-playfair",
});

const dmSans = localFont({
  src: [
    { path: "../fonts/DMSans_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/DMSans_500Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/DMSans_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/DMSans_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-dm-sans",
});

const dmMono = localFont({
  src: [
    { path: "../fonts/DMMono_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/DMMono_500Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
});

export const metadata = {
  title: "OneWord — App Store Screenshots",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
