import React from 'react';
import { Deal } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';

interface DealCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
}

const DealCard: React.FC<DealCardProps> = ({
  deal,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete
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

  return (
    <div
      className={`p-3 sm:p-4 rounded-md shadow-sm border cursor-pointer hover:shadow-md transition-shadow group ${
        deal.status === 'won' 
          ? 'bg-green-50 border-green-200' 
          : deal.status === 'lost'
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-gray-200'
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-mobile-sm font-medium text-gray-900 truncate">
            {deal.name}
          </h4>
          {deal.Contact && (
            <p className="mt-1 text-mobile-xs text-gray-500 truncate">
              {deal.Contact.firstName} {deal.Contact.lastName}
              {deal.Contact.company && ` • ${deal.Contact.company}`}
            </p>
          )}
          <p className="mt-2 text-mobile-base font-semibold text-gray-900">
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