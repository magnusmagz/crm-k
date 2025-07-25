import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Deal } from '../types';

interface VirtualizedDealListProps {
  deals: Deal[];
  height: number;
  renderDeal: (deal: Deal) => React.ReactNode;
  itemHeight: number;
}

const VirtualizedDealList: React.FC<VirtualizedDealListProps> = ({
  deals,
  height,
  renderDeal,
  itemHeight = 120
}) => {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const deal = deals[index];
    if (!deal) return null;
    
    return (
      <div style={style}>
        <div className="px-4 py-2">
          {renderDeal(deal)}
        </div>
      </div>
    );
  }, [deals, renderDeal]);

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-mobile-sm">No deals in this stage</p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={deals.length}
      itemSize={itemHeight}
      width="100%"
      className="scrollbar-thin scrollbar-thumb-gray-300"
    >
      {Row}
    </List>
  );
};

export default VirtualizedDealList;