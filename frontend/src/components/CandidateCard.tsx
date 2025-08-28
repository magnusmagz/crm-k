import React from 'react';
import { TrashIcon, StarIcon, BriefcaseIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface CandidateCardProps {
  candidate: {
    id: string;
    candidateId: string;
    positionId: string;
    rating?: number;
    interviewDate?: Date;
    status: 'active' | 'hired' | 'passed' | 'withdrawn';
    notes?: string;
    candidate?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      skills?: string[];
      experienceYears?: number;
      currentEmployer?: string;
      currentRole?: string;
      linkedinUrl?: string;
    };
    Position?: {
      id: string;
      title: string;
      department?: string;
      location?: string;
    };
  };
  onDragStart: (e: React.DragEvent, candidate: any) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  isSelected = false,
  onToggleSelect
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this candidate from the pipeline?')) {
      onDelete();
    }
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? (
              <StarIconSolid className="h-3 w-3 text-yellow-500" />
            ) : (
              <StarIcon className="h-3 w-3 text-gray-300" />
            )}
          </span>
        ))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'passed':
        return 'bg-gray-100 text-gray-600';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-primary-light text-primary-dark';
    }
  };

  // Handle if candidate data is not loaded yet
  if (!candidate.candidate || !candidate.Position) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-gray-400 text-sm">Loading candidate data...</div>
      </div>
    );
  }

  const candidateInfo = candidate.candidate;
  const positionInfo = candidate.Position;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, candidate)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-move border ${
        isSelected ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          )}
          <h4 className="font-medium text-primary-dark">
            {candidateInfo.firstName} {candidateInfo.lastName}
          </h4>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Position Info */}
      <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
        <BriefcaseIcon className="h-3 w-3" />
        <span className="truncate">{positionInfo.title}</span>
      </div>

      {/* Contact Info */}
      {candidateInfo.email && (
        <div className="text-xs text-gray-500 truncate mb-1">
          {candidateInfo.email}
        </div>
      )}

      {/* Current Employment */}
      {candidateInfo.currentEmployer && (
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">Current:</span> {candidateInfo.currentRole} at {candidateInfo.currentEmployer}
        </div>
      )}

      {/* Experience */}
      {candidateInfo.experienceYears && (
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">Experience:</span> {candidateInfo.experienceYears} years
        </div>
      )}

      {/* Skills */}
      {candidateInfo.skills && candidateInfo.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidateInfo.skills.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {skill}
            </span>
          ))}
          {candidateInfo.skills.length > 3 && (
            <span className="text-xs text-gray-500">+{candidateInfo.skills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Rating */}
      {candidate.rating && (
        <div className="mb-2">
          {renderStars(candidate.rating)}
        </div>
      )}

      {/* Interview Date */}
      {candidate.interviewDate && (
        <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
          <CalendarIcon className="h-3 w-3" />
          <span>Interview: {new Date(candidate.interviewDate).toLocaleDateString()}</span>
        </div>
      )}

      {/* Location */}
      {positionInfo.location && (
        <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
          <MapPinIcon className="h-3 w-3" />
          <span>{positionInfo.location}</span>
        </div>
      )}

      {/* Status Badge */}
      {candidate.status !== 'active' && (
        <div className="mt-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(candidate.status)}`}>
            {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
          </span>
        </div>
      )}

      {/* LinkedIn */}
      {candidateInfo.linkedinUrl && (
        <div className="mt-2">
          <a
            href={candidateInfo.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-primary hover:text-primary-dark"
          >
            View LinkedIn Profile
          </a>
        </div>
      )}
    </div>
  );
};

export default CandidateCard;