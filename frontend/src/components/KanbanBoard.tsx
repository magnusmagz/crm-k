import React, { useState } from 'react';
import { Stage, Deal } from '../types';
import DealCard from './DealCard';

interface KanbanBoardProps {
  stages: Stage[];
  deals: Deal[];
  onDealMove: (dealId: string, stageId: string) => void;
  onDealClick: (deal: Deal) => void;
  onDealDelete: (dealId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  deals,
  onDealMove,
  onDealClick,
  onDealDelete
}) => {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  const DEALS_PER_STAGE_LIMIT = 20; // Show first 20 deals by default

  const getDealsByStage = (stageId: string) => {
    return deals.filter(deal => deal.stageId === stageId);
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

  const formatCurrency = (value: number) => {
    // Ensure value is a valid number
    const numValue = isNaN(value) ? 0 : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (stageId: string) => {
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stageId !== stageId) {
      onDealMove(draggedDeal.id, stageId);
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(stage => {
        const stageDeals = getDealsByStage(stage.id);
        const totalValue = stageDeals.reduce((sum, deal) => {
          const value = parseFloat(String(deal.value)) || 0;
          return sum + value;
        }, 0);

        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg ${
              dragOverStage === stage.id ? 'ring-2 ring-gray-400' : ''
            }`}
            onDragOver={handleDragOver}
            onDragEnter={() => handleDragEnter(stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage Header */}
            <div 
              className="p-4 border-b border-gray-200"
              style={{ borderTopColor: stage.color, borderTopWidth: '4px' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                <span className="text-sm text-gray-500">
                  {stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'}
                </span>
              </div>
              <div className={`mt-1 font-medium ${
                stage.name === 'Closed Won' ? 'text-lg text-green-600' : 
                stage.name === 'Closed Lost' ? 'text-lg text-red-600' : 
                'text-sm text-gray-600'
              }`}>
                {formatCurrency(totalValue)}
              </div>
            </div>

            {/* Deals Container */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {stageDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No deals in this stage</p>
                </div>
              ) : (
                <>
                  {/* Show limited deals or all if expanded */}
                  {(expandedStages.has(stage.id) ? stageDeals : stageDeals.slice(0, DEALS_PER_STAGE_LIMIT))
                    .map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => onDealClick(deal)}
                        onDelete={() => onDealDelete(deal.id)}
                      />
                    ))
                  }
                  
                  {/* Show more/less button */}
                  {stageDeals.length > DEALS_PER_STAGE_LIMIT && (
                    <button
                      onClick={() => toggleStageExpansion(stage.id)}
                      className="w-full mt-3 py-2 text-mobile-sm text-blue-600 hover:text-blue-800 font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors touch-target"
                    >
                      {expandedStages.has(stage.id) 
                        ? 'Show less' 
                        : `Show ${stageDeals.length - DEALS_PER_STAGE_LIMIT} more deals`
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;