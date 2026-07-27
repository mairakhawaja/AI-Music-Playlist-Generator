import { Button } from "../../components/ui";
import "./GenerateButton.css";

export interface GenerateButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export function GenerateButton({
  onClick,
  loading,
  disabled,
}: GenerateButtonProps) {
  return (
    <div className="generate-button-wrapper">
      <Button
        className="generate-button"
        onClick={onClick}
        loading={loading}
        disabled={disabled}
      >
        Generate Playlist
      </Button>
    </div>
  );
}
