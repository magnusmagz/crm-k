import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon, ChevronDownIcon, MegaphoneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMode } from '../contexts/AppModeContext';
import FixedFAB from './FixedFAB';
import MobileNav from './MobileNav';
import { BriefcaseIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import useDebounce from '../hooks/useDebounce';
import api from '../services/api';

const navigation = [
  { name: 'Contacts', href: '/contacts' },
  { name: 'Companies', href: '/companies' },
  { name: 'Pipeline', href: '/pipeline' },
  { name: 'Reminders', href: '/reminders' },
  { name: 'Round-Robin', href: '/round-robin' },
];

const marketingNavigation = [
  { name: 'Templates', href: '/email-templates' },
  { name: 'Actions', href: '/automations' },
  { name: 'Metrics', href: '/email-analytics' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { crmName, primaryColor } = useTheme();
  const { mode, toggleMode } = useAppMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ contacts: [], deals: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch search results
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (debouncedSearchQuery && debouncedSearchQuery.length > 0) {
        setIsSearching(true);
        try {
          const response = await api.get('/search', {
            params: { q: debouncedSearchQuery, limit: 5 }
          });
          setSearchResults(response.data);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults({ contacts: [], deals: [] });
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ contacts: [], deals: [] });
        setShowSearchDropdown(false);
      }
    };

    fetchSearchResults();
  }, [debouncedSearchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResultClick = (type: 'contact' | 'deal', id: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (type === 'contact') {
      navigate(`/contacts?view=${id}`);
    } else {
      navigate(`/pipeline?deal=${id}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <>
      <div className="min-h-full">
        <Disclosure as="nav" style={{ backgroundColor: primaryColor || '#1f2937' }}>
          {({ open }) => (
            <>
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <h1 className="text-white text-mobile-lg font-bold">{crmName}</h1>
                    </div>
                    <div className="hidden md:block">
                      <div className="ml-10 flex items-baseline space-x-4">
                        {navigation.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={classNames(
                              location.pathname === item.href
                                ? 'bg-primary-light text-white'
                                : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white',
                              'rounded-md px-3 py-2 text-sm font-medium transition-colors'
                            )}
                          >
                            {item.name}
                          </Link>
                        ))}
                        
                        {/* Marketing Dropdown */}
                        <Menu as="div" className="relative">
                          <Menu.Button className={classNames(
                            marketingNavigation.some(item => location.pathname === item.href)
                              ? 'bg-primary-light text-white'
                              : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white',
                            'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                          )}>
                            <MegaphoneIcon className="h-4 w-4 mr-2" />
                            Marketing
                            <ChevronDownIcon className="ml-1 h-4 w-4" />
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              {marketingNavigation.map((item) => (
                                <Menu.Item key={item.name}>
                                  {({ active }) => (
                                    <Link
                                      to={item.href}
                                      className={classNames(
                                        active ? 'bg-gray-100' : '',
                                        location.pathname === item.href ? 'bg-gray-50 font-semibold' : '',
                                        'block px-4 py-2 text-sm text-gray-700'
                                      )}
                                    >
                                      {item.name}
                                    </Link>
                                  )}
                                </Menu.Item>
                              ))}
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block flex-1 max-w-md mx-4" ref={searchRef}>
                    {/* Global Search Bar */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => debouncedSearchQuery && setShowSearchDropdown(true)}
                        placeholder="Search everything..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 bg-opacity-50 text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white focus:bg-opacity-100 focus:ring-1 focus:ring-primary focus:border-primary focus:text-gray-900 focus:placeholder-gray-500 sm:text-sm transition-colors"
                      />
                      {/* Search indicator */}
                      {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                      
                      {/* Search Results Dropdown */}
                      {showSearchDropdown && (searchResults.contacts.length > 0 || searchResults.deals.length > 0) && (
                        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-auto">
                          {/* Contacts Section */}
                          {searchResults.contacts.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Contacts ({searchResults.contacts.length})
                                </h3>
                              </div>
                              {searchResults.contacts.map((contact: any) => (
                                <button
                                  key={contact.id}
                                  onClick={() => handleResultClick('contact', contact.id)}
                                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-start text-left border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {contact.firstName} {contact.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {contact.company && <span>{contact.company} • </span>}
                                      {contact.email || contact.phone}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Deals Section */}
                          {searchResults.deals.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Deals ({searchResults.deals.length})
                                </h3>
                              </div>
                              {searchResults.deals.map((deal: any) => (
                                <button
                                  key={deal.id}
                                  onClick={() => handleResultClick('deal', deal.id)}
                                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-start text-left border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {deal.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {deal.Contact && (
                                        <span>{deal.Contact.firstName} {deal.Contact.lastName} • </span>
                                      )}
                                      {formatCurrency(deal.value)}
                                      {deal.Stage && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" 
                                              style={{ backgroundColor: `${deal.Stage.color}20`, color: deal.Stage.color }}>
                                          {deal.Stage.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* View All Links - Stacked */}
                          <div className="bg-gray-50 border-t border-gray-200">
                            <Link
                              to={`/contacts?search=${encodeURIComponent(searchQuery)}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="block px-4 py-2 text-xs text-primary hover:text-primary-dark hover:bg-gray-100 font-medium transition-colors"
                            >
                              View all contacts →
                            </Link>
                            <Link
                              to={`/pipeline?search=${encodeURIComponent(searchQuery)}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="block px-4 py-2 text-xs text-primary hover:text-primary-dark hover:bg-gray-100 font-medium border-t border-gray-200 transition-colors"
                            >
                              View all deals →
                            </Link>
                          </div>
                        </div>
                      )}
                      
                      {/* No Results Message */}
                      {showSearchDropdown && debouncedSearchQuery && searchResults.contacts.length === 0 && searchResults.deals.length === 0 && !isSearching && (
                        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 px-4 py-3">
                          <p className="text-sm text-gray-500 text-center">No results found for "{debouncedSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="ml-4 flex items-center md:ml-6">
                      {/* Mode Toggle Button */}
                      <button
                        onClick={toggleMode}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors mr-4"
                        title={`Switch to ${mode === 'sales' ? 'Recruiting' : 'Sales'} Mode`}
                      >
                        {mode === 'sales' ? (
                          <>
                            <BriefcaseIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Sales Mode</span>
                          </>
                        ) : (
                          <>
                            <UserGroupIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Recruiting Mode</span>
                          </>
                        )}
                      </button>
                      <Menu as="div" className="relative ml-3">
                        <div>
                          <Menu.Button className="flex max-w-xs items-center rounded-full bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary">
                            <span className="sr-only">Open user menu</span>
                            <UserCircleIcon className="h-8 w-8 text-gray-300" />
                          </Menu.Button>
                        </div>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <Menu.Item>
                              <div className="px-4 py-2 text-sm text-gray-700">
                                {profile?.firstName} {profile?.lastName}
                              </div>
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  to="/profile"
                                  className={classNames(
                                    active ? 'bg-gray-100' : '',
                                    'block px-4 py-2 text-sm text-gray-700'
                                  )}
                                >
                                  Your Profile
                                </Link>
                              )}
                            </Menu.Item>
                            {user?.isAdmin && (
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to="/users"
                                    className={classNames(
                                      active ? 'bg-gray-100' : '',
                                      'block px-4 py-2 text-sm text-gray-700'
                                    )}
                                  >
                                    Manage Users
                                  </Link>
                                )}
                              </Menu.Item>
                            )}
                            {user?.isSuperAdmin && (
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to="/super-admin"
                                    className={classNames(
                                      active ? 'bg-gray-100' : '',
                                      'block px-4 py-2 text-sm text-gray-700 font-medium text-purple-600'
                                    )}
                                  >
                                    🔐 Super Admin
                                  </Link>
                                )}
                              </Menu.Item>
                            )}
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={handleLogout}
                                  className={classNames(
                                    active ? 'bg-gray-100' : '',
                                    'block w-full text-left px-4 py-2 text-sm text-gray-700'
                                  )}
                                >
                                  Sign out
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  </div>
                  <div className="-mr-2 flex md:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-primary p-2 text-gray-300 hover:bg-primary-dark hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary">
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>

              <Disclosure.Panel className="md:hidden">
                {({ close }) => (
                <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
                  {/* Mobile Search Bar */}
                  <div className="px-1 pb-3" ref={searchRef}>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => debouncedSearchQuery && setShowSearchDropdown(true)}
                        placeholder="Search everything..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 bg-opacity-50 text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white focus:bg-opacity-100 focus:ring-1 focus:ring-primary focus:border-primary focus:text-gray-900 focus:placeholder-gray-500 text-base transition-colors"
                      />
                      {/* Search indicator */}
                      {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}

                      {/* Search Results Dropdown */}
                      {showSearchDropdown && (searchResults.contacts.length > 0 || searchResults.deals.length > 0) && (
                        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-auto">
                          {/* Contacts Section */}
                          {searchResults.contacts.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Contacts ({searchResults.contacts.length})
                                </h3>
                              </div>
                              {searchResults.contacts.map((contact: any) => (
                                <button
                                  key={contact.id}
                                  onClick={() => {
                                    handleResultClick('contact', contact.id);
                                    close();
                                  }}
                                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-start text-left border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {contact.firstName} {contact.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {contact.company && <span>{contact.company} • </span>}
                                      {contact.email || contact.phone}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Deals Section */}
                          {searchResults.deals.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Deals ({searchResults.deals.length})
                                </h3>
                              </div>
                              {searchResults.deals.map((deal: any) => (
                                <button
                                  key={deal.id}
                                  onClick={() => {
                                    handleResultClick('deal', deal.id);
                                    close();
                                  }}
                                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-start text-left border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {deal.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {deal.Contact && (
                                        <span>{deal.Contact.firstName} {deal.Contact.lastName} • </span>
                                      )}
                                      {formatCurrency(deal.value)}
                                      {deal.Stage && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                              style={{ backgroundColor: `${deal.Stage.color}20`, color: deal.Stage.color }}>
                                          {deal.Stage.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* View All Links - Stacked */}
                          <div className="bg-gray-50 border-t border-gray-200">
                            <Link
                              to={`/contacts?search=${encodeURIComponent(searchQuery)}`}
                              onClick={() => {
                                setShowSearchDropdown(false);
                                close();
                              }}
                              className="block px-4 py-2 text-xs text-primary hover:text-primary-dark hover:bg-gray-100 font-medium transition-colors"
                            >
                              View all contacts →
                            </Link>
                            <Link
                              to={`/pipeline?search=${encodeURIComponent(searchQuery)}`}
                              onClick={() => {
                                setShowSearchDropdown(false);
                                close();
                              }}
                              className="block px-4 py-2 text-xs text-primary hover:text-primary-dark hover:bg-gray-100 font-medium border-t border-gray-200 transition-colors"
                            >
                              View all deals →
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* No Results Message */}
                      {showSearchDropdown && debouncedSearchQuery && searchResults.contacts.length === 0 && searchResults.deals.length === 0 && !isSearching && (
                        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 px-4 py-3">
                          <p className="text-sm text-gray-500 text-center">No results found for "{debouncedSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => close()}
                      className={classNames(
                        location.pathname === item.href
                          ? 'bg-primary-light text-white'
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white',
                        'block rounded-md px-3 py-2 text-base font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}

                  {/* Marketing section */}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Marketing
                    </div>
                    {marketingNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => close()}
                        className={classNames(
                          location.pathname === item.href
                            ? 'bg-primary-light text-white'
                            : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white',
                          'block rounded-md px-3 py-2 text-base font-medium'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>

                  {/* Mode Toggle */}
                  <div className="pt-2 border-t border-gray-700">
                    <button
                      onClick={toggleMode}
                      className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors text-base font-medium"
                    >
                      {mode === 'sales' ? (
                        <>
                          <BriefcaseIcon className="h-5 w-5" />
                          <span>Sales Mode</span>
                        </>
                      ) : (
                        <>
                          <UserGroupIcon className="h-5 w-5" />
                          <span>Recruiting Mode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* User menu */}
                  <div className="border-t border-gray-700 pt-4 pb-3">
                    <div className="px-3 text-base font-medium text-white">
                      {profile?.firstName} {profile?.lastName}
                    </div>
                    <div className="mt-3 space-y-1">
                      <Link
                        to="/profile"
                        onClick={() => close()}
                        className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white"
                      >
                        Your Profile
                      </Link>
                      {user?.isAdmin && (
                        <Link
                          to="/users"
                          onClick={() => close()}
                          className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white"
                        >
                          Manage Users
                        </Link>
                      )}
                      {user?.isSuperAdmin && (
                        <Link
                          to="/super-admin"
                          onClick={() => close()}
                          className="block rounded-md px-3 py-2 text-base font-medium text-purple-300 hover:bg-white hover:bg-opacity-10 hover:text-white"
                        >
                          🔐 Super Admin
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          close();
                          handleLogout();
                        }}
                        className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        <main className="no-scroll-x">
          <div className="container-mobile py-mobile pb-20 md:pb-6">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
      <FixedFAB />
    </>
  );
};

export default Layout;