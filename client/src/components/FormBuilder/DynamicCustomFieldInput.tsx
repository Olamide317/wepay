import React, { useId } from 'react';
import { CustomField } from '../../types/wepay';
import { normalizeFieldType } from '../../utils/formatters';
import { Input, Select, Textarea } from '../ui/FormControls';

interface DynamicCustomFieldInputProps {
  field: CustomField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
}

export const DynamicCustomFieldInput: React.FC<DynamicCustomFieldInputProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const autoId = useId();
  const fieldType = normalizeFieldType(field.type);
  const stringVal = Array.isArray(value) ? value.join(', ') : value || '';
  const arrayVal = Array.isArray(value) ? value : value ? [value] : [];
  const options = field.options && field.options.length > 0 ? field.options : [];

  if (fieldType === 'long_text') {
    return (
      <Textarea
        id={autoId}
        label={field.label}
        required={field.required}
        showOptionalHint={!field.required}
        placeholder={field.placeholder || ''}
        hint={field.helpText}
        value={stringVal}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        disabled={disabled}
        rows={3}
      />
    );
  }

  if (fieldType === 'select') {
    return (
      <Select
        id={autoId}
        label={field.label}
        required={field.required}
        showOptionalHint={!field.required}
        hint={field.helpText}
        value={stringVal}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        disabled={disabled}
      >
        <option value="">{field.placeholder || 'Select an option...'}</option>
        {options.map((opt, idx) => (
          <option key={`${opt}-${idx}`} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  if (fieldType === 'radio') {
    return (
      <fieldset className="space-y-2" aria-invalid={Boolean(error)}>
        <legend className="block text-sm font-medium text-slate-700">
          {field.label}
          {field.required ? (
            <span className="text-red-600 ml-0.5">*</span>
          ) : (
            <span className="text-xs font-normal text-slate-400 ml-1.5">(Optional)</span>
          )}
        </legend>
        <div className="space-y-2">
          {options.map((opt, idx) => {
            const optionId = `${autoId}-radio-${idx}`;
            const checked = stringVal === opt;
            return (
              <label
                key={optionId}
                htmlFor={optionId}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                  checked
                    ? 'border-indigo-600 bg-indigo-50/70 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={autoId}
                  value={opt}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {!error && field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
      </fieldset>
    );
  }

  if (fieldType === 'checkbox') {
    const toggleOption = (opt: string) => {
      const exists = arrayVal.includes(opt);
      const next = exists ? arrayVal.filter((item) => item !== opt) : [...arrayVal, opt];
      onChange(next);
    };

    return (
      <fieldset className="space-y-2" aria-invalid={Boolean(error)}>
        <legend className="block text-sm font-medium text-slate-700">
          {field.label}
          {field.required ? (
            <span className="text-red-600 ml-0.5">*</span>
          ) : (
            <span className="text-xs font-normal text-slate-400 ml-1.5">(Optional)</span>
          )}
        </legend>
        <div className="space-y-2">
          {options.map((opt, idx) => {
            const optionId = `${autoId}-chk-${idx}`;
            const checked = arrayVal.includes(opt);
            return (
              <label
                key={optionId}
                htmlFor={optionId}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                  checked
                    ? 'border-indigo-600 bg-indigo-50/70 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  id={optionId}
                  type="checkbox"
                  value={opt}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleOption(opt)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {!error && field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
      </fieldset>
    );
  }

  const inputType =
    fieldType === 'email'
      ? 'email'
      : fieldType === 'phone'
      ? 'tel'
      : fieldType === 'number'
      ? 'number'
      : 'text';

  return (
    <Input
      id={autoId}
      label={field.label}
      type={inputType}
      required={field.required}
      showOptionalHint={!field.required}
      placeholder={field.placeholder || ''}
      hint={field.helpText}
      value={stringVal}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      disabled={disabled}
    />
  );
};
