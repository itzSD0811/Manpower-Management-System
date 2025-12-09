import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  containerClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, error, options, placeholder = "Select an option", containerClassName, ...props }) => {
  return (
    <div className={containerClassName || "mb-4"}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-dns-red focus:border-dns-red sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 ${
          error ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
        {...props}
      >
        <option value="" disabled className="text-gray-500 dark:text-gray-400">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900 dark:text-gray-200">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Select;