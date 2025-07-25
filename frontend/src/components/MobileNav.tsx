import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  UserCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  SparklesIcon as SparklesIconSolid
} from '@heroicons/react/24/solid';

const MobileNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      iconActive: HomeIconSolid,
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: UserGroupIcon,
      iconActive: UserGroupIconSolid,
    },
    {
      name: 'Pipeline',
      href: '/pipeline',
      icon: ChartBarIcon,
      iconActive: ChartBarIconSolid,
    },
    {
      name: 'Actions',
      href: '/automations',
      icon: SparklesIcon,
      iconActive: SparklesIconSolid,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserCircleIcon,
      iconActive: UserCircleIconSolid,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg pb-safe z-40">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = isActive ? item.iconActive : item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center py-2 px-1 touch-target ${
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-0.5 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;