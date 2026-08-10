import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const AnimatedCard = ({ children, delay = 0, className = '' }: Props) => (
  <div
    className={`card border-0 shadow-sm h-100 ${className}`}
    style={{
      animation: `fadeInUp 0.5s ease forwards ${delay}ms`,
      opacity: 0,
      borderRadius: 12,
    }}
  >
    {children}
  </div>
);

export default AnimatedCard;