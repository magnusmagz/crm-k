import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import EntityDebugView from './automation/EntityDebugView';
import { Deal } from '../types';

interface DealDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
}

const DealDebugModal: React.FC<DealDebugModalProps> = ({ isOpen, onClose, deal }) => {
  if (!deal) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="modal-mobile transform overflow-hidden bg-white text-left align-middle shadow-xl transition-all">
                <div className="sticky top-0 bg-white border-b px-mobile py-3 sm:py-4 flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-mobile-lg font-medium leading-6 text-primary-dark truncate pr-2"
                  >
                    Deal Debug - {deal.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 touch-target flex items-center justify-center"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="px-mobile py-mobile">
                  <EntityDebugView entityType="deal" entityId={deal.id} />
                  
                  <div className="mt-4 sm:mt-6">
                    <button
                      type="button"
                      className="btn-mobile w-full sm:w-auto justify-center rounded-md border border-transparent bg-gray-100 font-medium text-primary-dark hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DealDebugModal;