import { useEffect, useState } from "react";

export default function Toast({ type = "info", message, duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const iconMap = {
    success: "✓",
    error: "✕",
    loading: "⟳",
    info: "ⓘ",
  };

  return (
    <div className={`toast toast${type.charAt(0).toUpperCase() + type.slice(1)}`}>
      <span>{iconMap[type] || iconMap.info}</span>
      <span>{message}</span>
    </div>
  );
}
