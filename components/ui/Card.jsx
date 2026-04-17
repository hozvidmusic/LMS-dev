export default function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div className={`rounded-2xl p-5 transition-all ${hover ? 'cursor-pointer' : ''} ${className}`}
      style={{ background: '#1c1c26', border: '1px solid #2a2a38' }}
      onClick={onClick}
      onMouseEnter={e => { if (hover) e.currentTarget.style.borderColor = '#7c6af7'; }}
      onMouseLeave={e => { if (hover) e.currentTarget.style.borderColor = '#2a2a38'; }}>
      {children}
    </div>
  );
}
