import React, { useState, useRef, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  threshold = 80,
  className = ''
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefresher, setShowRefresher] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      // Only allow pull-to-refresh when at the top of the page
      if (scrollTop > 0) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      
      if (diff > 0) {
        e.preventDefault();
        // Apply resistance to the pull
        const distance = diff > threshold ? threshold + (diff - threshold) * 0.3 : diff;
        setPullDistance(Math.min(distance, threshold * 1.5));
        setShowRefresher(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold * 0.8); // Keep indicator visible during refresh
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setTimeout(() => setShowRefresher(false), 300);
        }
      } else {
        setPullDistance(0);
        setTimeout(() => setShowRefresher(false), 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pullDistance, isRefreshing, onRefresh, threshold]);

  const getRefresherOpacity = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / threshold, 1);
  };

  const getRefresherScale = () => {
    if (isRefreshing) return 1;
    return 0.6 + (Math.min(pullDistance / threshold, 1) * 0.4);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull-to-refresh indicator */}
      {showRefresher && (
        <div 
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-300 z-50"
          style={{
            top: `-${threshold * 0.8}px`,
            transform: `translateY(${pullDistance}px)`,
            opacity: getRefresherOpacity()
          }}
        >
          <div 
            className="bg-white rounded-full shadow-lg p-3"
            style={{
              transform: `scale(${getRefresherScale()})`
            }}
          >
            <ArrowPathIcon 
              className={`h-6 w-6 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: !isRefreshing ? `rotate(${pullDistance * 2}deg)` : undefined
              }}
            />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div 
        style={{
          transform: showRefresher && pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: !touchStartY.current ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;