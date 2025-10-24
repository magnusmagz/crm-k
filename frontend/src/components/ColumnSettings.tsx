import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, Bars3Icon, AdjustmentsVerticalIcon } from '@heroicons/react/24/outline';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
}

interface ColumnSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  availableColumns?: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
}

const ColumnSettings: React.FC<ColumnSettingsProps> = ({ isOpen, onClose, columns, availableColumns, onSave }) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Update local columns when columns prop changes (e.g., when custom fields are loaded)
  React.useEffect(() => {
    if (availableColumns && availableColumns.length > columns.length) {
      // Merge existing columns with new available columns
      const existingIds = new Set(columns.map(col => col.id));
      const newColumns = availableColumns.filter(col => !existingIds.has(col.id));
      setLocalColumns([...columns, ...newColumns]);
    } else {
      setLocalColumns(columns);
    }
  }, [columns, availableColumns]);

  const handleToggleVisibility = (id: string) => {
    setLocalColumns(prev =>
      prev.map(col => col.id === id ? { ...col, visible: !col.visible } : col)
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...localColumns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    setLocalColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    if (availableColumns) {
      // Reset to all available columns with their default visibility
      setLocalColumns(availableColumns);
    } else {
      // Fallback to basic default
      const defaultColumns: ColumnConfig[] = [
        { id: 'lastContacted', label: 'Last Contacted', visible: true, sortable: true },
        { id: 'name', label: 'Name', visible: true, sortable: true },
        { id: 'email', label: 'Email', visible: true, sortable: true },
        { id: 'phone', label: 'Phone', visible: true },
        { id: 'company', label: 'Company', visible: true, sortable: true },
        { id: 'tags', label: 'Tags', visible: true },
        { id: 'notes', label: 'Notes', visible: true },
        { id: 'deals', label: 'Deals', visible: true },
      ];
      setLocalColumns(defaultColumns);
    }
  };

  const visibleCount = localColumns.filter(col => col.visible).length;

  // Categorize columns for better UX
  const coreColumns = localColumns.filter(col =>
    ['lastContacted', 'name', 'email', 'phone', 'company', 'position', 'tags', 'notes', 'deals'].includes(col.id)
  );
  const metadataColumns = localColumns.filter(col =>
    ['createdAt', 'updatedAt', 'isUnsubscribed'].includes(col.id)
  );
  const recruitingColumns = localColumns.filter(col =>
    ['contactType', 'resumeUrl', 'linkedinUrl', 'githubUrl', 'skills', 'experienceYears',
     'availability', 'currentEmployer', 'currentRole'].includes(col.id)
  );
  const customFieldColumns = localColumns.filter(col => col.id.startsWith('customFields.'));

  const renderColumnGroup = (title: string, columns: ColumnConfig[]) => {
    if (columns.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
        <div className="space-y-2">
          {columns.map((column, index) => {
            const globalIndex = localColumns.findIndex(c => c.id === column.id);
            return (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(globalIndex)}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                  draggedIndex === globalIndex ? 'opacity-50' : ''
                }`}
              >
                <Bars3Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleToggleVisibility(column.id)}
                  disabled={column.visible && visibleCount === 1}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label className="flex-1 text-sm font-medium text-gray-900 cursor-move">
                  {column.label}
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-light sm:mx-0 sm:h-10 sm:w-10">
                    <AdjustmentsVerticalIcon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Customize Columns
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500">
                      Show or hide columns and drag to reorder them. At least one column must be visible.
                    </p>
                  </div>
                </div>

                <div className="mt-6 max-h-96 overflow-y-auto">
                  {renderColumnGroup('Core Fields', coreColumns)}
                  {renderColumnGroup('Metadata', metadataColumns)}
                  {renderColumnGroup('Recruiting', recruitingColumns)}
                  {renderColumnGroup('Custom Fields', customFieldColumns)}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={handleReset}
                  >
                    Reset to Default
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ColumnSettings;
