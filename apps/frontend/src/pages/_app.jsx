import "@/styles/globals.css";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import { ProvideUser } from "@/contexts/user.context";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <ProvideUser>
        <Component {...pageProps} />
      </ProvideUser>
    </div>
  );
}
