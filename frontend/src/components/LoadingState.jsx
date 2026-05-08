export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="loadingState">
      <div className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
