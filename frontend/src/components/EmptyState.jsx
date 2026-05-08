export default function EmptyState({ icon = null, title, message, children }) {
  return (
    <div className="emptyState">
      {icon ? <div className="emptyIcon">{icon}</div> : null}
      <div className="emptyTitle">{title}</div>
      <div className="emptyMessage">{message}</div>
      {children}
    </div>
  );
}
