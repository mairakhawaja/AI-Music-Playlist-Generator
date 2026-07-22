import { type HTMLAttributes } from "react";
import "./PillBadge.css";

export interface PillBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
}

export function PillBadge({ label, className = "", ...rest }: PillBadgeProps) {
  return (
    <span className={`pill-badge ${className}`.trim()} {...rest}>
      {label}
    </span>
  );
}
