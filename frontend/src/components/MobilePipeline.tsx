import React, { useState, useRef, useEffect } from 'react';
import { Stage, Deal } from '../types';
import DealCard from './DealCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface MobilePipelineProps {
  stages: Stage[];
  deals: Deal[];
  onDealMove: (dealId: string, stageId: string) => void;
  onDealClick: (deal: Deal) => void;
  onDealDelete: (dealId: string) => void;
  selectedDeals?: Set<string>;
  onDealToggleSelect?: (dealId: string) => void;
}

const MobilePipeline: React.FC<MobilePipelineProps> = ({
  stages,
  deals,
  onDealMove,
  onDealClick,
  onDealDelete,
  selectedDeals = new Set(),
  onDealToggleSelect
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  const DEALS_PER_STAGE_LIMIT = 10; // Show fewer deals on mobile by default
  const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
  const currentStage = stages[currentStageIndex];

  const getDealsByStage = (stageId: string) => {
    return deals.filter(deal => deal.stageId === stageId);
  };

  const formatCurrency = (value: number) => {
    const numValue = isNaN(value) ? 0 : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const goToPreviousStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const goToNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;
    
    if (isLeftSwipe) {
      goToNextStage();
    } else if (isRightSwipe) {
      goToPreviousStage();
    }
    
    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!currentStage) return null;

  const stageDeals = getDealsByStage(currentStage.id);
  const totalValue = stageDeals.reduce((sum, deal) => {
    const value = parseFloat(String(deal.value)) || 0;
    return sum + value;
  }, 0);

  return (
    <div className="md:hidden">
      {/* Stage Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousStage}
          disabled={currentStageIndex === 0}
          className="p-2 rounded-full bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-target flex items-center justify-center"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex-1 text-center">
          <h3 className="font-semibold text-primary-dark text-mobile-base">{currentStage.name}</h3>
          <div className="flex items-center justify-center gap-1 mt-1">
            {stages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStageIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStageIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={goToNextStage}
          disabled={currentStageIndex === stages.length - 1}
          className="p-2 rounded-full bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-target flex items-center justify-center"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Stage Content */}
      <div 
        className="bg-gray-50 rounded-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Stage Header */}
        <div 
          className="p-mobile border-b border-gray-200"
          style={{ borderTopColor: currentStage.color, borderTopWidth: '4px' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-mobile-sm text-gray-500">
              {stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'}
            </span>
            <div className={`font-medium ${
              currentStage.name === 'Closed Won' ? 'text-mobile-base text-green-600' : 
              currentStage.name === 'Closed Lost' ? 'text-mobile-base text-red-600' : 
              'text-mobile-sm text-gray-600'
            }`}>
              {formatCurrency(totalValue)}
            </div>
          </div>
        </div>

        {/* Deals Container */}
        <div className="p-mobile space-y-2 min-h-[300px]">
          {stageDeals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-mobile-sm">No deals in this stage</p>
            </div>
          ) : (
            <>
              {/* Show limited deals or all if expanded */}
              {(expandedStages.has(currentStage.id) ? stageDeals : stageDeals.slice(0, DEALS_PER_STAGE_LIMIT))
                .map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={() => {}} // Disable drag on mobile
                    onDragEnd={() => {}}
                    onClick={() => onDealClick(deal)}
                    onDelete={() => onDealDelete(deal.id)}
                    isSelected={selectedDeals.has(deal.id)}
                    onToggleSelect={onDealToggleSelect ? () => onDealToggleSelect(deal.id) : undefined}
                  />
                ))
              }
              
              {/* Show more/less button */}
              {stageDeals.length > DEALS_PER_STAGE_LIMIT && (
                <button
                  onClick={() => toggleStageExpansion(currentStage.id)}
                  className="w-full mt-3 py-2 text-mobile-sm text-blue-600 hover:text-blue-800 font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors touch-target"
                >
                  {expandedStages.has(currentStage.id) 
                    ? 'Show less' 
                    : `Show ${stageDeals.length - DEALS_PER_STAGE_LIMIT} more deals`
                  }
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stage Actions */}
      <div className="mt-4 text-center">
        <p className="text-mobile-xs text-gray-500">
          Swipe or use arrows to navigate between stages
        </p>
      </div>
    </div>
  );
};

export default MobilePipeline;