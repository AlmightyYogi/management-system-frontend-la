const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="d-flex flex-column justify-content-center align-items-center py-5">
    <div
      className="spinner-border text-primary mb-3"
      style={{ width: '2.5rem', height: '2.5rem' }}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
    <p className="text-muted small mb-0">{message}</p>
  </div>
);

export default LoadingSpinner;