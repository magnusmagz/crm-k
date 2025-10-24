import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { contactsAPI } from '../services/api';

interface InlineEditTagsProps {
  value: string[];
  onSave: (tags: string[]) => Promise<void>;
  placeholder?: string;
}

const InlineEditTags: React.FC<InlineEditTagsProps> = ({
  value,
  onSave,
  placeholder = 'Click to add tags'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(value || []);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalTags(value || []);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      fetchAllTags();
    }
  }, [isEditing]);

  const fetchAllTags = async () => {
    try {
      const response = await contactsAPI.getTags();
      setAllTags(response.data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !localTags.includes(trimmedTag)) {
      setLocalTags([...localTags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setLocalTags(localTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Backspace' && !inputValue && localTags.length > 0) {
      removeTag(localTags[localTags.length - 1]);
    }
  };

  const handleSave = async () => {
    // Check if tags have changed
    const tagsChanged = JSON.stringify([...localTags].sort()) !== JSON.stringify([...value].sort());

    if (!tagsChanged) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localTags);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save tags:', error);
      setLocalTags(value || []);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalTags(value || []);
    setInputValue('');
    setIsEditing(false);
    setShowSuggestions(false);
  };

  const filteredSuggestions = allTags.filter(tag =>
    tag.toLowerCase().includes(inputValue.toLowerCase()) &&
    !localTags.includes(tag)
  );

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative min-w-[200px]">
        <div className="flex flex-wrap gap-1 px-2 py-1 border border-primary rounded bg-white focus-within:ring-1 focus-within:ring-primary">
          {localTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-xs bg-gray-200 text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-gray-300 rounded p-0.5 transition-colors"
              >
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay to allow clicking suggestions
              setTimeout(() => {
                handleSave();
              }, 200);
            }}
            placeholder={localTags.length === 0 ? 'Type to add tags...' : ''}
            disabled={isSaving}
            className="flex-1 min-w-[80px] border-none outline-none focus:ring-0 p-0 text-xs"
          />
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
            {filteredSuggestions.map((tag, index) => (
              <button
                key={index}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs"
              >
                <span className="inline-flex items-center px-1.5 py-0 rounded text-xs bg-gray-200 text-gray-700">
                  {tag}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded group min-h-[32px]"
      title="Click to edit tags"
    >
      <div className="flex flex-wrap gap-1">
        {localTags && localTags.length > 0 ? (
          localTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0 rounded text-xs bg-gray-200 text-gray-700"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-xs">{placeholder}</span>
        )}
      </div>
      <PencilIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
};

export default InlineEditTags;
