import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

interface InlineEditDateProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
}

const InlineEditDate: React.FC<InlineEditDateProps> = ({ value, onSave, placeholder = 'Click to set date' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update localValue when value prop changes - convert to YYYY-MM-DD format for date input
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      const formatted = date.toISOString().split('T')[0];
      setLocalValue(formatted);
    } else {
      setLocalValue('');
    }
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    console.log('handleSave called', { localValue, value });

    // If no value selected, just close
    if (!localValue) {
      setIsEditing(false);
      return;
    }

    // Normalize both dates to YYYY-MM-DD format for comparison
    const normalizeDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    const normalizedLocal = normalizeDate(localValue);
    const normalizedValue = normalizeDate(value);

    console.log('Normalized dates:', { normalizedLocal, normalizedValue });

    if (normalizedLocal === normalizedValue) {
      console.log('No change detected, closing editor');
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving date:', localValue);
      await onSave(localValue);
      console.log('Date saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setLocalValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formattedDate = value ? new Date(value).toLocaleDateString() : placeholder;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="date"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className="px-2 py-1 border border-primary rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded group"
      title="Click to edit"
    >
      <span className={value ? 'text-gray-900' : 'text-gray-400'}>
        {formattedDate}
      </span>
      <PencilIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default InlineEditDate;
