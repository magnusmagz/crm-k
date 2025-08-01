import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Contact } from '../../types';

interface VariablePickerProps {
  onVariableSelect: (variable: string) => void;
  contact: Contact;
}

const VariablePicker: React.FC<VariablePickerProps> = ({ onVariableSelect, contact }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Define available variables
  const variables = [
    { label: 'First Name', value: '{{firstName}}', preview: contact.firstName || 'John' },
    { label: 'Last Name', value: '{{lastName}}', preview: contact.lastName || 'Doe' },
    { label: 'Email', value: '{{email}}', preview: contact.email },
    { label: 'Phone', value: '{{phone}}', preview: contact.phone || '(555) 123-4567' },
    { label: 'Company', value: '{{company}}', preview: contact.company || 'Acme Corp' },
    { label: 'Position', value: '{{position}}', preview: contact.position || 'Manager' },
  ];

  // Add custom fields if they exist
  if (contact.customFields && Object.keys(contact.customFields).length > 0) {
    Object.entries(contact.customFields).forEach(([key, value]) => {
      variables.push({
        label: `Custom: ${key}`,
        value: `{{customFields.${key}}}`,
        preview: value || `[${key}]`
      });
    });
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVariableClick = (variable: string) => {
    onVariableSelect(variable);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <span>Insert Variable</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1 max-h-60 overflow-y-auto">
            {variables.map((variable) => (
              <button
                key={variable.value}
                type="button"
                onClick={() => handleVariableClick(variable.value)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{variable.label}</span>
                  <span className="text-xs text-gray-500 ml-2 truncate max-w-[120px]">
                    {variable.preview}
                  </span>
                </div>
                <div className="text-xs text-primary mt-0.5">{variable.value}</div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
            <p className="text-xs text-gray-600">
              Variables will be replaced with actual contact data when sending
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariablePicker;