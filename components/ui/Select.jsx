export default function Select({ label, id, value, onChange, options = [], required }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium" style={{ color: '#9090a8' }}>
          {label}{required && <span style={{ color: '#f87171' }}> *</span>}
        </label>
      )}
      <select id={id} value={value} onChange={onChange} required={required}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}
            style={{ background: '#1c1c26', color: '#e8e8f0' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
