import { useEffect } from "react";
import Icon from "./Icon";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const iconName = type === "success" ? "check-circle" : type === "error" ? "x-circle" : "info";
  return (
    <div className={`toast ${type}`} onClick={onClose}>
      <Icon name={iconName} size={16} color="white" /> {message}
    </div>
  );
}
