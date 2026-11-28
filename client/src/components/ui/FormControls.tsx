import React, { useId } from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  showOptionalHint?: boolean;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseFieldProps {
  labelAction?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  labelAction,
  error,
  hint,
  required,
  showOptionalHint,
  leftAddon,
  rightAddon,
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
          {label}
          {required ? (
            <span className="text-red-600 ml-0.5">*</span>
          ) : showOptionalHint ? (
            <span className="text-xs font-normal text-slate-400 ml-1.5">(Optional)</span>
          ) : null}
        </label>
        {labelAction}
      </div>
      <div className="relative flex items-center">
        {leftAddon && (
          <div className="absolute left-3 text-slate-500 text-sm pointer-events-none select-none">
            {leftAddon}
          </div>
        )}
        <input
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={`w-full h-11 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500 ${
            error ? 'border-red-500 focus:border-red-600 focus:ring-red-600/20' : 'border-slate-200'
          } ${leftAddon ? 'pl-9' : 'px-3.5'} ${rightAddon ? 'pr-11' : 'pr-3.5'} ${className}`}
          {...rest}
        />
        {rightAddon && <div className="absolute right-2.5 flex items-center">{rightAddon}</div>}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  required,
  showOptionalHint,
  className = '',
  id,
  rows = 3,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span className="text-red-600 ml-0.5">*</span>
        ) : showOptionalHint ? (
          <span className="text-xs font-normal text-slate-400 ml-1.5">(Optional)</span>
        ) : null}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 disabled:bg-slate-50 ${
          error ? 'border-red-500 focus:border-red-600 focus:ring-red-600/20' : 'border-slate-200'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  required,
  showOptionalHint,
  className = '',
  id,
  children,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span className="text-red-600 ml-0.5">*</span>
        ) : showOptionalHint ? (
          <span className="text-xs font-normal text-slate-400 ml-1.5">(Optional)</span>
        ) : null}
      </label>
      <select
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-900 transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 disabled:bg-slate-50 ${
          error ? 'border-red-500 focus:border-red-600 focus:ring-red-600/20' : 'border-slate-200'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, error, id, className = '', ...rest }) => {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="inline-flex items-start gap-2.5 cursor-pointer select-none">
        <input
          id={fieldId}
          type="checkbox"
          className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer ${className}`}
          {...rest}
        />
        <span className="text-sm text-slate-600 leading-snug">{label}</span>
      </label>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
};
