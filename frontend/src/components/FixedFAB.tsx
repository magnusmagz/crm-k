import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import QuickContactForm from './QuickContactForm';

const FixedFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="Add new contact"
      >
        <Plus className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="modal-mobile bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-mobile py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-mobile-lg font-semibold">Quick Add Contact</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-mobile">
              <QuickContactForm onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FixedFAB;