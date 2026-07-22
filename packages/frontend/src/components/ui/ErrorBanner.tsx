import "./ErrorBanner.css";

export interface ErrorBannerProps {
  message: string;
  correlationId?: string;
}

export function ErrorBanner({ message, correlationId }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner__message">{message}</p>
      {correlationId && (
        <p className="error-banner__correlation-id">
          Correlation ID: {correlationId}
        </p>
      )}
    </div>
  );
}
