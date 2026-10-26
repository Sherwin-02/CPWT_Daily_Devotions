const LABELS = {
  pending: 'Image not made yet',
  rendering: 'Making image…',
  awaiting_approval: 'Waiting for approval',
  approved: 'Approved',
  posting: 'Posting…',
  posted: 'Posted',
  skipped: 'Skipped',
  failed: 'Problem',
};

export default function StatusBadge({ status }) {
  return <span className={`badge s-${status}`}>{LABELS[status] || status}</span>;
}
