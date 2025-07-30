import React, { Fragment } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FixedFAB from './FixedFAB';
import MobileNav from './MobileNav';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Contacts', href: '/contacts' },
  { name: 'Pipeline', href: '/pipeline' },
  { name: 'Actions', href: '/automations' },
  { name: 'Custom Fields', href: '/custom-fields' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { crmName, primaryColor } = useTheme();

  // Debug logging
  console.log('Layout - Theme values:', { crmName, primaryColor, profile });

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="ml-4 flex items-center md:ml-6">
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

              <Disclosure.Panel className="hidden">
                {/* Mobile menu panel is hidden - using bottom navigation instead */}
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