import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CustomField, CustomFieldType } from '../../types/wepay';
import { getCustomFieldTypeLabel, normalizeFieldType } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Checkbox, Input, Select } from '../ui/FormControls';
import { DynamicCustomFieldInput } from './DynamicCustomFieldInput';

interface ContributorFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const FIELD_TYPES: { value: CustomFieldType; label: string; hasOptions: boolean }[] = [
  { value: 'short_text', label: 'Short text', hasOptions: false },
  { value: 'long_text', label: 'Long text', hasOptions: false },
  { value: 'email', label: 'Email', hasOptions: false },
  { value: 'phone', label: 'Phone number', hasOptions: false },
  { value: 'number', label: 'Number', hasOptions: false },
  { value: 'select', label: 'Dropdown / select', hasOptions: true },
  { value: 'radio', label: 'Radio buttons', hasOptions: true },
  { value: 'checkbox', label: 'Checkboxes', hasOptions: true },
];

function isOptionType(type: CustomFieldType): boolean {
  return type === 'select' || type === 'radio' || type === 'checkbox';
}

interface DraftField {
  id?: string;
  label: string;
  type: CustomFieldType;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
}

const EMPTY_DRAFT: DraftField = {
  label: '',
  type: 'short_text',
  placeholder: '',
  helpText: '',
  required: true,
  options: ['Option 1', 'Option 2'],
};

export const ContributorFieldsBuilder: React.FC<ContributorFieldsBuilderProps> = ({
  fields,
  onChange,
}) => {
  const [mode, setMode] = useState<'builder' | 'preview'>('builder');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftField>(EMPTY_DRAFT);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string | string[]>>({});

  const openAddEditor = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      options: ['Option 1', 'Option 2'],
    });
    setNewOptionInput('');
    setDraftError(null);
    setEditorOpen(true);
    setMode('builder');
  };

  const openEditEditor = (field: CustomField) => {
    const normalizedType = normalizeFieldType(field.type);
    setEditingId(field.id);
    setDraft({
      id: field.id,
      label: field.label,
      type: normalizedType,
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      required: field.required,
      options:
        field.options && field.options.length > 0 ? [...field.options] : ['Option 1', 'Option 2'],
    });
    setNewOptionInput('');
    setDraftError(null);
    setEditorOpen(true);
    setMode('builder');
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraftError(null);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      options: [...prev.options, trimmed],
    }));
    setNewOptionInput('');
    setDraftError(null);
  };

  const handleOptionChange = (index: number, value: string) => {
    setDraft((prev) => {
      const next = [...prev.options];
      next[index] = value;
      return { ...prev, options: next };
    });
  };

  const handleRemoveOption = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveField = () => {
    const label = draft.label.trim();
    if (!label) {
      setDraftError('Please enter a field label.');
      return;
    }

    const duplicateLabel = fields.some(
      (f) => f.id !== editingId && f.label.trim().toLowerCase() === label.toLowerCase()
    );
    if (duplicateLabel) {
      setDraftError('Another field already uses this label. Use a distinct field label.');
      return;
    }

    let cleanedOptions: string[] | undefined;
    if (isOptionType(draft.type)) {
      cleanedOptions = draft.options.map((o) => o.trim()).filter(Boolean);
      if (cleanedOptions.length === 0) {
        setDraftError('Add at least one answer option for this field type.');
        return;
      }
      // Deduplicate while preserving order
      cleanedOptions = Array.from(new Set(cleanedOptions));
    }

    const builtField: CustomField = {
      id: editingId || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      type: draft.type,
      required: draft.required,
      placeholder: draft.placeholder.trim() || undefined,
      helpText: draft.helpText.trim() || undefined,
      options: cleanedOptions,
    };

    if (editingId) {
      onChange(
        fields.map((f, idx) =>
          f.id === editingId ? { ...builtField, order: idx } : { ...f, order: idx }
        )
      );
    } else {
      const next = [...fields, builtField].map((f, idx) => ({ ...f, order: idx }));
      onChange(next);
    }

    closeEditor();
  };

  const handleDeleteField = (id: string) => {
    if (editingId === id) {
      closeEditor();
    }
    const next = fields.filter((f) => f.id !== id).map((f, idx) => ({ ...f, order: idx }));
    onChange(next);
  };

  const handleMoveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next.map((f, idx) => ({ ...f, order: idx })));
  };

  const toggleRequiredQuick = (id: string) => {
    onChange(
      fields.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );
  };

  return (
    <Card>
      <div className="space-y-5">
        {/* Section Header + Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              4. Contributor Information Fields
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Full name, email, and phone number are always collected for Interswitch receipts. Add
              any custom fields, e.g(matric no, Address) below to collect extra contributor or
              fulfillment details
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('builder')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  mode === 'builder'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Builder
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview Form</span>
              </button>
            </div>

            <Button type="button" size="sm" variant="outline" onClick={openAddEditor}>
              <Plus className="h-4 w-4" />
              <span>Add Field</span>
            </Button>
          </div>
        </div>

        {/* Builder Mode */}
        {mode === 'builder' ? (
          <div className="space-y-4">
            {/* Existing Custom Fields List */}
            {fields.length > 0 ? (
              <div className="space-y-2.5">
                {fields.map((field, index) => {
                  const normalizedType = normalizeFieldType(field.type);
                  const isEditingThis = editorOpen && editingId === field.id;
                  return (
                    <div
                      key={field.id}
                      className={`p-3.5 rounded-xl border transition-colors ${
                        isEditingThis
                          ? 'border-indigo-600 bg-indigo-50/40'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-xs font-mono-num text-slate-400">
                              {index + 1}.
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {field.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              · {getCustomFieldTypeLabel(field.type)}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <button
                              type="button"
                              onClick={() => toggleRequiredQuick(field.id)}
                              className={`text-xs font-medium hover:underline cursor-pointer ${
                                field.required ? 'text-indigo-700' : 'text-slate-500'
                              }`}
                            >
                              {field.required ? 'Required' : 'Optional'}
                            </button>
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 pl-4">
                            {field.placeholder && (
                              <span>Placeholder: &ldquo;{field.placeholder}&rdquo;</span>
                            )}
                            {field.helpText && <span>Help: {field.helpText}</span>}
                            {isOptionType(normalizedType) && field.options && (
                              <span>
                                {field.options.length} option{field.options.length === 1 ? '' : 's'}
                                : {field.options.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleMoveField(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${field.label} up`}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(index, 1)}
                            disabled={index === fields.length - 1}
                            aria-label={`Move ${field.label} down`}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditEditor(field)}
                            aria-label={`Edit ${field.label}`}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-indigo-700 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.id)}
                            aria-label={`Delete ${field.label}`}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !editorOpen && (
                <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-2">
                  <ListChecks className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">
                    No custom contributor fields added yet
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click &ldquo;Add Field&rdquo; to collect Hostel Room, Matric Number, T-Shirt
                    Size, Delivery Preference, or any custom information.
                  </p>
                </div>
              )
            )}

            {/* Add / Edit Field Configuration Panel */}
            {editorOpen && (
              <div className="p-4 sm:p-5 rounded-xl border border-indigo-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingId ? 'Edit Custom Field' : 'Configure New Field'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeEditor}
                    aria-label="Close field editor"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {draftError && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    {draftError}
                  </p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Field label"
                    required
                    placeholder="e.g. Hostel Room, T-Shirt Size, Delivery Note"
                    value={draft.label}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, label: e.target.value }));
                      setDraftError(null);
                    }}
                  />

                  <Select
                    label="Field type"
                    value={draft.type}
                    onChange={(e) => {
                      const nextType = e.target.value as CustomFieldType;
                      setDraft((prev) => ({
                        ...prev,
                        type: nextType,
                        options:
                          isOptionType(nextType) && prev.options.length === 0
                            ? ['Option 1', 'Option 2']
                            : prev.options,
                      }));
                      setDraftError(null);
                    }}
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {draft.type !== 'radio' && draft.type !== 'checkbox' && (
                    <Input
                      label="Placeholder text"
                      placeholder={
                        draft.type === 'select'
                          ? 'e.g. Choose an option...'
                          : 'e.g. Enter your answer'
                      }
                      value={draft.placeholder}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, placeholder: e.target.value }))
                      }
                    />
                  )}

                  <Input
                    label="Help text (optional)"
                    placeholder="Short instruction shown below this field"
                    value={draft.helpText}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, helpText: e.target.value }))
                    }
                  />
                </div>

                {/* Options Editor for Select / Radio / Checkbox */}
                {isOptionType(draft.type) && (
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Answer Options ({draft.options.length})
                      </span>
                      <span className="text-xs text-slate-500">
                        Edit existing options or add new ones below
                      </span>
                    </div>

                    <div className="space-y-2">
                      {draft.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono-num text-slate-400 w-5 text-right">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            aria-label={`Option ${idx + 1}`}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            disabled={draft.options.length <= 1}
                            aria-label={`Remove option ${idx + 1}`}
                            className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                        placeholder="Type new answer option..."
                        aria-label="New answer option"
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddOption}
                        disabled={!newOptionInput.trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Option</span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <Checkbox
                    label="Required field (contributor must answer before paying)"
                    checked={draft.required}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, required: e.target.checked }))
                    }
                  />

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button type="button" size="sm" variant="ghost" onClick={closeEditor}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveField}>
                      {editingId ? 'Save Changes' : 'Add to Form'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Live Preview Mode */
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Contributor Form Live Preview
                </p>
                <p className="text-xs text-slate-500">
                  Interactive preview of how contributors will experience your fields.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setMode('builder')}>
                Back to Builder
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              {/* Standard baseline fields context */}
              <div className="space-y-3 pb-3 border-b border-slate-100 opacity-75">
                <p className="text-xs font-medium text-slate-500">
                  Standard payment contact fields (included automatically)
                </p>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                    Full name <span className="text-red-600">*</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                    Email address <span className="text-red-600">*</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                    Phone number <span className="text-red-600">*</span>
                  </div>
                </div>
              </div>

              {fields.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No custom fields configured. Switch to Builder and click &ldquo;Add Field&rdquo; to
                  add custom contributor questions.
                </p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field) => (
                    <DynamicCustomFieldInput
                      key={field.id}
                      field={field}
                      value={previewValues[field.id]}
                      onChange={(val) =>
                        setPreviewValues((prev) => ({
                          ...prev,
                          [field.id]: val,
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
