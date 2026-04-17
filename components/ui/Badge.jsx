export default function Badge({ status }) {
  const isActive = status === 'active';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: isActive ? '#4ade8020' : '#f8717120', color: isActive ? '#4ade80' : '#f87171' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#4ade80' : '#f87171' }} />
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}
