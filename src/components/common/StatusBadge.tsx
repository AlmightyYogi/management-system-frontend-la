import { REPORT_STATUS } from '../../types/report';

interface StatusBadgeProps {
  status: number;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusInfo = REPORT_STATUS[status] ?? { 
    label: 'Unknown', 
    color: 'secondary' 
  };

  return (
    <span 
      className={`badge bg-${statusInfo.color} ${
        statusInfo.color === 'warning' || statusInfo.color === 'light' 
          ? 'text-dark' 
          : 'text-white'
      }`}
    >
      {statusInfo.label}
    </span>
  );
};

export default StatusBadge;