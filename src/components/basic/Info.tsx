import { type ReactNode } from 'react';
import Icon from './Icon';

interface InfoProps {
  children: ReactNode;
}

export default function Info({ children }: InfoProps) {
  return (
    <div className="relative group">
      <Icon name="info" />
      <div
        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm whitespace-pre-line text-left font-light"
        style={{
          position: 'fixed',
          display: 'flex',
          width: '340px',
          padding: '16px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '10px',
          borderRadius: '8px',
          border: '1px solid #C4C6C6',
          background: 'rgba(0, 0, 0, 0.80)',
          zIndex: 9999,
          transform: 'translateY(8px)',
          pointerEvents: 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}