import { useAuth } from "./useAuth";
import { Button } from "../../components/ui/Button";

/**
 * Landing page that prompts the user to connect their Spotify account.
 */
export function ConnectPage() {
  const { login } = useAuth();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "24px",
        fontFamily: "inherit",
      }}
    >
      <h1 style={{ color: "var(--text-primary)", fontSize: "28px", margin: 0 }}>
        AI Music Generator
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
        Connect your Spotify account to get personalized recommendations.
      </p>
      <Button onClick={() => login()}>Connect Spotify</Button>
    </div>
  );
}
