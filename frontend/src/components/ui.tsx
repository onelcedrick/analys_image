import React from 'react';

export const Button = ({ variant = 'default', size = 'md', className = '', children, ...props }: any) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    default: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
    outline: 'border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 focus:ring-gray-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-gray-800',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ className = '', children, ...props }: any) => (
  <div className={`rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const SectionTitle = ({ children, className = '' }: any) => (
  <h3 className={`text-lg font-semibold text-white mb-4 ${className}`}>{children}</h3>
);

export const StatCard = ({ label, value, color = 'text-white' }: any) => (
  <div className="p-4 bg-gray-800/50 rounded-lg">
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-gray-400 mt-1">{label}</div>
  </div>
);

export const Toggle = ({ label, defaultChecked = false }: any) => {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="sr-only" />
        <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-gray-700'}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </div>
      </div>
    </label>
  );
};

export const SegmentedControl = ({ options, value, defaultValue, onChange }: any) => {
  const [selected, setSelected] = React.useState(defaultValue || value);
  const handleChange = (val: string) => {
    setSelected(val);
    if (onChange) onChange(val);
  };
  return (
    <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-1">
      {options.map((opt: any) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          className={`px-3 py-1.5 text-xs rounded-md transition-all ${
            selected === opt.value ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
