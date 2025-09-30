import React, { useState, useRef } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import ContactCard from './ContactCard';
import { Contact } from '../types';

interface SwipeableContactCardProps {
  contact: Contact;
  onDelete: (id: string) => void;
  onUpdate?: (updatedContact: Contact) => void;
}

const SwipeableContactCard: React.FC<SwipeableContactCardProps> = ({ contact, onDelete, onUpdate }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger delete
  const DELETE_ZONE_WIDTH = 80; // Width of the delete zone
  const ANIMATION_DURATION = 300; // ms

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;

    // Don't interfere with interactive elements or zones marked data-no-swipe
    if (
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="button"]') ||
      target.closest('[data-no-swipe]')
    ) {
      touchStartX.current = -1; // Mark as invalid
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Ignore if touch started on an interactive element
    if (touchStartX.current === -1) {
      return;
    }

    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      // Apply resistance after threshold
      const offset = diff > SWIPE_THRESHOLD
        ? SWIPE_THRESHOLD + (diff - SWIPE_THRESHOLD) * 0.3
        : diff;

      setSwipeOffset(Math.min(offset, DELETE_ZONE_WIDTH));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Ignore if touch started on an interactive element
    if (touchStartX.current === -1) {
      touchStartX.current = 0; // Reset for next touch
      return;
    }

    const touchDuration = Date.now() - touchStartTime.current;
    const velocity = swipeOffset / touchDuration;

    // If swiped far enough or fast enough, show delete confirmation
    if (swipeOffset >= SWIPE_THRESHOLD || velocity > 0.5) {
      setSwipeOffset(DELETE_ZONE_WIDTH);
      setShowDeleteConfirm(true);
    } else {
      // Snap back
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    // Animate the card sliding out
    if (cardRef.current) {
      cardRef.current.style.transition = `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`;
      cardRef.current.style.transform = 'translateX(-100%)';
      cardRef.current.style.opacity = '0';
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      onDelete(contact.id);
    }, ANIMATION_DURATION);
  };

  const handleCancel = () => {
    setSwipeOffset(0);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div 
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4"
        style={{
          opacity: Math.min(swipeOffset / DELETE_ZONE_WIDTH, 1)
        }}
      >
        <div className="text-white">
          <TrashIcon className="h-6 w-6" />
          <span className="text-mobile-xs mt-1 block">Delete</span>
        </div>
      </div>

      {/* Swipeable card container */}
      <div
        ref={cardRef}
        className="relative bg-white"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: showDeleteConfirm || swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ContactCard contact={contact} onDelete={onDelete} onUpdate={onUpdate} />
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && !isDeleting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 mx-4 max-w-sm shadow-xl">
            <h3 className="text-mobile-base font-semibold mb-2">Delete Contact?</h3>
            <p className="text-mobile-sm text-gray-600 mb-4">
              Are you sure you want to delete {contact.firstName} {contact.lastName}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 btn-mobile bg-gray-200 text-primary rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 btn-mobile bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableContactCard;