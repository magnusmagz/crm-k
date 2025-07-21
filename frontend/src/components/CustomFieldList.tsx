import React from 'react';
import { CustomField } from '../types';
import { PencilIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface CustomFieldListProps {
  fields: CustomField[];
  onEdit: (field: CustomField) => void;
  onDelete: (id: string) => void;
  onReorder?: (fieldIds: string[]) => void;
}

const CustomFieldList: React.FC<CustomFieldListProps> = ({ 
  fields, 
  onEdit, 
  onDelete,
  onReorder 
}) => {
  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      number: 'Number',
      date: 'Date',
      select: 'Dropdown',
      checkbox: 'Checkbox',
      url: 'URL',
    };
    return labels[type] || type;
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {fields.map((field, index) => (
          <li key={field.id}>
            <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center flex-1">
                {onReorder && (
                  <Bars3Icon className="h-5 w-5 text-gray-400 mr-3 cursor-move" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {field.label}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>{getFieldTypeLabel(field.type)}</span>
                        <span className="mx-2">•</span>
                        <span>Field name: {field.name}</span>
                        {field.required && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-red-600">Required</span>
                          </>
                        )}
                      </div>
                      {field.type === 'select' && field.options && (
                        <div className="mt-1 text-sm text-gray-500">
                          Options: {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() => onEdit(field)}
                  className="text-gray-600 hover:text-gray-900"
                  title="Edit field"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onDelete(field.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete field"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomFieldList;