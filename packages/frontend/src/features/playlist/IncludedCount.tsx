import { useEffect, useRef, useState } from "react";
import { useTrackSelectionStore, selectIncludedCount } from "./trackSelectionStore";
import "./IncludedCount.css";

export function IncludedCount() {
  const count = useTrackSelectionStore(selectIncludedCount);
  const [animate, setAnimate] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (prevCount.current !== count) {
      setAnimate(true);
      prevCount.current = count;
      const timer = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <span
      className={`included-count ${animate ? "included-count--updated" : ""}`.trim()}
      aria-label={`${count} tracks included`}
    >
      {count}
    </span>
  );
}
