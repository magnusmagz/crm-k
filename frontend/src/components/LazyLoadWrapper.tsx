import React from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  className?: string;
  rootMargin?: string;
}

const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({ 
  children, 
  placeholder,
  className = '',
  rootMargin = '100px'
}) => {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin,
    triggerOnce: true
  });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
};

export default LazyLoadWrapper;