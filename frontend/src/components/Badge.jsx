export default function Badge({ children, color = "default", className = "", ...props }) {
  return (
    <span className={`badge badge-${color} ${className}`} {...props}>
      {children}
    </span>
  );
}
