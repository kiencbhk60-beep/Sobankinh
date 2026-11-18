import './theme.css';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const labels: Record<ConnectionState, string> = {
  connecting: 'Đang kết nối máy chủ',
  connected: 'Đã kết nối máy chủ',
  disconnected: 'Mất kết nối máy chủ',
};

export default function ConnectionIndicator({status}: {status: ConnectionState}) {
  return <span className={`server-status ${status}`} role="status" aria-live="polite" aria-atomic="true" title={labels[status]}>
    <span className="server-status-dot" aria-hidden="true"/>
    <span className="server-status-label">{labels[status]}</span>
  </span>;
}
