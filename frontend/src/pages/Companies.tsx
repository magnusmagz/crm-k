import React, { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { companiesAPI } from '../services/api';
import { Company } from '../types';
import { PlusIcon, BuildingOfficeIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import CompanyForm from '../components/CompanyForm';
import Pagination from '../components/Pagination';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCompanies();
  }, [search, currentPage, pageSize, sortBy, sortOrder]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const response = await companiesAPI.getAll({
        search: search || undefined,
        limit: pageSize,
        offset: offset,
        sortBy,
        sortOrder,
      });
      setCompanies(response.data.companies);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleCompanyCreated = (company: Company) => {
    setCompanies(prev => [company, ...prev]);
    setShowNewCompany(false);
    setTotal(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      await companiesAPI.delete(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      setTotal(prev => prev - 1);
      toast.success('Company deleted successfully');
    } catch (error) {
      console.error('Failed to delete company:', error);
      toast.error('Failed to delete company');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-primary" />
    );
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-mobile-2xl font-bold text-primary-dark">Companies</h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowNewCompany(true)}
            className="btn-mobile inline-flex items-center justify-center rounded-md border border-transparent bg-primary font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">New Company</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search companies..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-base"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <Transition.Root show={showNewCompany} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowNewCompany}>
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
                  <CompanyForm
                    onSubmit={handleCompanyCreated}
                    onCancel={() => setShowNewCompany(false)}
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
        <div className="flex items-center justify-center h-64 mt-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : companies.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 mt-4">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-mobile-base font-medium text-primary-dark">No companies</h3>
          <p className="mt-1 text-mobile-sm text-gray-500">
            Get started by creating a new company.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowNewCompany(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              New Company
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="md:hidden mt-4">
            {/* Mobile Sort Dropdown */}
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="mobile-sort" className="text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                id="mobile-sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                  setCurrentPage(1);
                }}
                className="flex-1 rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:ring-primary"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="city-asc">City (A-Z)</option>
                <option value="city-desc">City (Z-A)</option>
                <option value="state-asc">State (A-Z)</option>
                <option value="state-desc">State (Z-A)</option>
              </select>
            </div>

            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white shadow rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/companies/${company.id}`}
                        className="text-lg font-medium text-primary hover:text-primary-dark"
                      >
                        {company.name}
                      </Link>
                      {(company.city || company.state) && (
                        <p className="mt-1 text-sm text-gray-500">
                          {[company.city, company.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                        {company.contactCount !== undefined && (
                          <span>
                            <span className="font-medium text-gray-700">{company.contactCount}</span> contacts
                          </span>
                        )}
                        {company.dealCount !== undefined && company.dealCount > 0 && (
                          <>
                            <span>
                              <span className="font-medium text-gray-700">{company.dealCount}</span> deals
                            </span>
                            {company.totalDealValue !== undefined && company.totalDealValue > 0 && (
                              <span>
                                <span className="font-medium text-green-600">
                                  ${company.totalDealValue.toLocaleString()}
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <Link
                      to={`/companies/${company.id}`}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDelete(company.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                          <button
                            onClick={() => handleSort('name')}
                            className="group inline-flex items-center gap-1 hover:text-primary"
                          >
                            Name
                            <SortIcon field="name" />
                          </button>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                          <button
                            onClick={() => handleSort('city')}
                            className="group inline-flex items-center gap-1 hover:text-primary"
                          >
                            City
                            <SortIcon field="city" />
                          </button>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                          <button
                            onClick={() => handleSort('state')}
                            className="group inline-flex items-center gap-1 hover:text-primary"
                          >
                            State
                            <SortIcon field="state" />
                          </button>
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                          Contacts
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                          Deals
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-dark">
                          Total Value
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {companies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-dark sm:pl-6">
                            <Link to={`/companies/${company.id}`} className="hover:text-primary">
                              {company.name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {company.city || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {company.state || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {company.contactCount !== undefined ? company.contactCount : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {company.dealCount !== undefined ? company.dealCount : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {company.totalDealValue !== undefined && company.totalDealValue > 0 ? (
                              <span className="font-medium text-green-600">
                                ${company.totalDealValue.toLocaleString()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              to={`/companies/${company.id}`}
                              className="text-primary hover:text-primary-dark mr-4"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(company.id)}
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

      {/* Pagination at bottom */}
      {total > 0 && (
        <div className="mb-24 md:mb-0">
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
    </div>
  );
};

export default Companies;
