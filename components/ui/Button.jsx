export default function Button({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const styles = {
    primary: { background: '#7c6af7', color: '#fff' },
    secondary: { background: '#22222e', color: '#9090a8', border: '1px solid #333344' },
    danger: { background: '#f8717120', color: '#f87171' },
    ghost: { background: 'transparent', color: '#9090a8' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${className}`} style={styles[variant]}>
      {children}
    </button>
  );
}
