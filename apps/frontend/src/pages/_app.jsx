import "@/styles/globals.css";
import { ProvideUser } from "@/contexts/user.context";

export default function App({ Component, pageProps }) {
  return (
    <ProvideUser>
      <Component {...pageProps} />
    </ProvideUser>
  );
}
