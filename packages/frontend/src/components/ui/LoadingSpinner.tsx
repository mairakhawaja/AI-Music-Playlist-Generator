import "./LoadingSpinner.css";

export interface LoadingSpinnerProps {
  variant?: "inline" | "fullscreen";
  /** Accessible label for screen readers */
  label?: string;
}

export function LoadingSpinner({
  variant = "inline",
  label = "Loading",
}: LoadingSpinnerProps) {
  if (variant === "fullscreen") {
    return (
      <div className="spinner-fullscreen" role="status" aria-label={label}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <span
      className="spinner spinner--inline"
      role="status"
      aria-label={label}
    />
  );
}
