export default function Input({ label, id, type = 'text', value, onChange, placeholder, required, error, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium" style={{ color: '#9090a8' }}>
          {label}{required && <span style={{ color: '#f87171' }}> *</span>}
        </label>
      )}
      <input id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all disabled:opacity-50"
        style={{ background: '#0f0f13', border: `1px solid ${error ? '#f87171' : '#333344'}`, color: '#e8e8f0' }}
        onFocus={e => !error && (e.target.style.borderColor = '#7c6af7')}
        onBlur={e => !error && (e.target.style.borderColor = '#333344')} />
      {error && <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>}
    </div>
  );
}
