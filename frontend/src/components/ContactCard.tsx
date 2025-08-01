import React from 'react';
import { Link } from 'react-router-dom';
import { Contact } from '../types';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  TagIcon,
  DocumentTextIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface ContactCardProps {
  contact: Contact;
  onDelete: (id: string) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      onDelete(contact.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link 
          to={`/contacts/${contact.id}`}
          className="flex-1 min-w-0"
        >
          <h3 className="text-mobile-base font-semibold text-primary-dark truncate">
            {contact.firstName} {contact.lastName}
          </h3>
          {contact.position && (
            <p className="text-mobile-sm text-gray-600 truncate">
              {contact.position}
            </p>
          )}
        </Link>
      </div>

      {/* Contact Details */}
      <div className="space-y-2">
        {contact.company && (
          <div className="flex items-center text-mobile-sm text-gray-600">
            <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contact.company}</span>
          </div>
        )}
        
        {contact.email && (
          <div className="flex items-center text-mobile-sm text-gray-600">
            <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <div className="flex items-center gap-2 truncate flex-1">
              <a 
                href={`mailto:${contact.email}`}
                className={`text-blue-600 hover:text-blue-800 ${contact.isUnsubscribed ? 'line-through opacity-60' : ''}`}
              >
                {contact.email}
              </a>
              {contact.isUnsubscribed && (
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0"
                  title={`Unsubscribed: ${contact.unsubscribeReason || 'Unknown reason'}`}
                >
                  Unsubscribed
                </span>
              )}
            </div>
          </div>
        )}
        
        {contact.phone && (
          <div className="flex items-center text-mobile-sm text-gray-600">
            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <a 
              href={`tel:${contact.phone}`}
              className="truncate text-blue-600 hover:text-blue-800"
            >
              {contact.phone}
            </a>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex items-start text-mobile-sm text-gray-600">
            <TagIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="flex items-start text-mobile-sm text-gray-600">
            <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="line-clamp-2">{contact.notes}</p>
          </div>
        )}

        {/* Deal Stats */}
        {contact.dealStats && contact.dealStats.dealCount > 0 && (
          <div className="flex items-center text-mobile-sm text-gray-600">
            <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <div className="flex items-center gap-3">
              <span>
                <span className="font-medium">{contact.dealStats.openDeals || 0}</span> open
                {!isNaN(contact.dealStats.openValue) && contact.dealStats.openValue > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (${(isNaN(contact.dealStats.openValue) ? 0 : contact.dealStats.openValue).toLocaleString()})
                  </span>
                )}
              </span>
              {contact.dealStats.wonDeals > 0 && (
                <span className="text-green-600">
                  <span className="font-medium">{contact.dealStats.wonDeals}</span> won
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
        <Link
          to={`/contacts/${contact.id}`}
          className="text-mobile-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View
        </Link>
      </div>
    </div>
  );
};

export default ContactCard;