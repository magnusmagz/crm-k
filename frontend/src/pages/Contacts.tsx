import React, { useEffect, useState, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { contactsAPI } from '../services/api';
import { Contact } from '../types';
import { PlusIcon, MagnifyingGlassIcon, UserGroupIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import ContactForm from '../components/ContactForm';
import ContactCard from '../components/ContactCard';
import SwipeableContactCard from '../components/SwipeableContactCard';
import PullToRefresh from '../components/PullToRefresh';
import LazyLoadWrapper from '../components/LazyLoadWrapper';
import ContactCardSkeleton from '../components/ContactCardSkeleton';
import ContactImport from '../components/ContactImport';
import Pagination from '../components/Pagination';
import { Dialog, Transition } from '@headlessui/react';

const Contacts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewContact, setShowNewContact] = useState(searchParams.get('new') === 'true');
  const [showImport, setShowImport] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchContacts();
  }, [search, currentPage, pageSize]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const response = await contactsAPI.getAll({ 
        search: search || undefined,
        limit: pageSize,
        offset: offset
      });
      setContacts(response.data.contacts);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (contact: Contact) => {
    setContacts(prev => [contact, ...prev]);
    setShowNewContact(false);
    setTotal(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await contactsAPI.delete(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleRefresh = async () => {
    await fetchContacts();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-mobile-2xl font-bold text-primary-dark">Contacts</h1>
          <p className="mt-2 text-mobile-sm text-gray-700">
            A list of all your contacts including their name, email, and phone.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="desktop-only inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNewContact(true)}
            className="btn-mobile inline-flex items-center justify-center rounded-md border border-transparent bg-primary font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Add contact</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Search contacts..."
          />
        </div>
      </div>

      <Transition.Root show={showNewContact} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowNewContact}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                  <ContactForm
                    onSubmit={handleContactCreated}
                    onCancel={() => setShowNewContact(false)}
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Pagination above content */}
      {total > pageSize && (
        <div className="mt-4 mb-2">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            totalItems={total}
            startItem={(currentPage - 1) * pageSize + 1}
            endItem={Math.min(currentPage * pageSize, total)}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <>
          {/* Mobile Loading */}
          <div className="md:hidden mt-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <ContactCardSkeleton key={i} />
            ))}
          </div>
          {/* Desktop Loading */}
          <div className="hidden md:flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </>
      ) : contacts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-mobile-base font-medium text-primary-dark">No contacts</h3>
          <p className="mt-1 text-mobile-sm text-gray-500">
            Get started by creating a new contact.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View with Swipe-to-Delete and Pull-to-Refresh */}
          <div className="md:hidden mt-4">
            <PullToRefresh onRefresh={handleRefresh}>
              {/* Swipe hint - shown only once */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-mobile-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <span>💡</span>
                  <span>Tip: Swipe left to delete • Pull down to refresh</span>
                </p>
              </div>
              <div className="space-y-3">
              {contacts.map((contact) => (
                <LazyLoadWrapper
                  key={contact.id}
                  placeholder={<ContactCardSkeleton />}
                  rootMargin="200px"
                >
                  <SwipeableContactCard
                    contact={contact}
                    onDelete={handleDelete}
                  />
                </LazyLoadWrapper>
              ))}
              </div>
            </PullToRefresh>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mt-4">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-dark sm:pl-6">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Email
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Phone
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Company
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Tags
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Notes
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                        Deals
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {contacts.map((contact) => (
                      <tr key={contact.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-dark sm:pl-6">
                          <Link to={`/contacts/${contact.id}`} className="hover:text-primary">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contact.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contact.phone}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contact.company || '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate" title={contact.notes || ''}>
                            {contact.notes || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {contact.dealStats && contact.dealStats.dealCount > 0 ? (
                            <div>
                              <span className="font-medium">{contact.dealStats.openDeals || 0}</span> open
                              <div className="text-xs text-gray-400">
                                ${(contact.dealStats.openValue || 0).toLocaleString()}
                              </div>
                              {contact.dealStats.wonDeals > 0 && (
                                <div className="text-xs text-green-600">
                                  {contact.dealStats.wonDeals} won
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {total > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(total / pageSize)}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1); // Reset to first page when page size changes
          }}
          totalItems={total}
          startItem={(currentPage - 1) * pageSize + 1}
          endItem={Math.min(currentPage * pageSize, total)}
        />
      )}

      {showImport && (
        <ContactImport onClose={() => {
          setShowImport(false);
          fetchContacts();
        }} />
      )}
    </div>
  );
};

export default Contacts;