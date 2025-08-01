import React from 'react';
import { Deal } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface DealCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const DealCard: React.FC<DealCardProps> = ({
  deal,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  isSelected = false,
  onToggleSelect
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysInStage = () => {
    const created = new Date(deal.createdAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleToggleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking checkbox
    if ((e.target as HTMLInputElement).type === 'checkbox') {
      return;
    }
    onClick();
  };

  return (
    <div
      className={`p-3 sm:p-4 rounded-md shadow-sm border cursor-pointer hover:shadow-md transition-shadow group ${
        isSelected ? 'ring-2 ring-primary bg-gray-50' : ''
      } ${
        deal.status === 'won' 
          ? 'bg-green-50 border-green-200' 
          : deal.status === 'lost'
          ? 'bg-red-50 border-red-200'
          : isSelected
          ? 'bg-gray-50 border-primary'
          : 'bg-white border-gray-200'
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 mr-3 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-mobile-sm font-medium text-primary-dark truncate">
            {deal.name}
          </h4>
          {deal.Contact && (
            <p className="mt-1 text-mobile-xs text-gray-500 truncate">
              {deal.Contact.firstName} {deal.Contact.lastName}
              {deal.Contact.company && ` • ${deal.Contact.company}`}
            </p>
          )}
          <p className="mt-2 text-mobile-base font-semibold text-primary-dark">
            {formatCurrency(deal.value || 0)}
          </p>
          <p className="mt-1 text-mobile-xs text-gray-400">
            {getDaysInStage()} {getDaysInStage() === 1 ? 'day' : 'days'} in stage
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 touch-target flex items-center justify-center"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DealCard;