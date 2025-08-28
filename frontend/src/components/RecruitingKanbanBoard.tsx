import React, { useState } from 'react';
import { Stage, RecruitingPipeline } from '../types';
import CandidateCard from './CandidateCard';

interface RecruitingKanbanBoardProps {
  stages: Stage[];
  pipelines: RecruitingPipeline[];
  onCandidateMove: (pipelineId: string, stageId: string) => void;
  onCandidateClick: (pipeline: RecruitingPipeline) => void;
  onCandidateDelete: (pipelineId: string) => void;
  selectedCandidates?: Set<string>;
  onCandidateToggleSelect?: (pipelineId: string) => void;
}

const RecruitingKanbanBoard: React.FC<RecruitingKanbanBoardProps> = ({
  stages,
  pipelines,
  onCandidateMove,
  onCandidateClick,
  onCandidateDelete,
  selectedCandidates = new Set(),
  onCandidateToggleSelect
}) => {
  const [draggedCandidate, setDraggedCandidate] = useState<RecruitingPipeline | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  const CANDIDATES_PER_STAGE_LIMIT = 20;

  const getCandidatesByStage = (stageId: string) => {
    return pipelines.filter(pipeline => pipeline.stageId === stageId);
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

  const handleDragStart = (e: React.DragEvent, candidate: RecruitingPipeline) => {
    setDraggedCandidate(candidate);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCandidate(null);
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
    if (draggedCandidate && draggedCandidate.stageId !== stageId) {
      onCandidateMove(draggedCandidate.id, stageId);
    }
    setDraggedCandidate(null);
    setDragOverStage(null);
  };

  const getStageStats = (stageId: string) => {
    const stageCandidates = getCandidatesByStage(stageId);
    return {
      total: stageCandidates.length,
      active: stageCandidates.filter(c => c.status === 'active').length,
      hired: stageCandidates.filter(c => c.status === 'hired').length,
      passed: stageCandidates.filter(c => c.status === 'passed').length
    };
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(stage => {
        const stageCandidates = getCandidatesByStage(stage.id);
        const stats = getStageStats(stage.id);

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
                <h3 className="font-semibold text-primary-dark">{stage.name}</h3>
                <span className="text-sm text-gray-500">
                  {stats.total} {stats.total === 1 ? 'candidate' : 'candidates'}
                </span>
              </div>
              {stats.total > 0 && (
                <div className="mt-2 flex items-center space-x-3 text-xs">
                  <span className="text-gray-600">Active: {stats.active}</span>
                  {stats.hired > 0 && (
                    <span className="text-green-600">Hired: {stats.hired}</span>
                  )}
                  {stats.passed > 0 && (
                    <span className="text-gray-600">Passed: {stats.passed}</span>
                  )}
                </div>
              )}
            </div>

            {/* Candidates Container */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {stageCandidates.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No candidates in this stage</p>
                </div>
              ) : (
                <>
                  {/* Show limited candidates or all if expanded */}
                  {(expandedStages.has(stage.id) ? stageCandidates : stageCandidates.slice(0, CANDIDATES_PER_STAGE_LIMIT))
                    .map(pipeline => (
                      <CandidateCard
                        key={pipeline.id}
                        candidate={pipeline as any}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => onCandidateClick(pipeline)}
                        onDelete={() => onCandidateDelete(pipeline.id)}
                        isSelected={selectedCandidates.has(pipeline.id)}
                        onToggleSelect={onCandidateToggleSelect ? () => onCandidateToggleSelect(pipeline.id) : undefined}
                      />
                    ))
                  }
                  
                  {/* Show more/less button */}
                  {stageCandidates.length > CANDIDATES_PER_STAGE_LIMIT && (
                    <button
                      onClick={() => toggleStageExpansion(stage.id)}
                      className="w-full mt-3 py-2 text-mobile-sm text-primary hover:text-primary-dark font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors touch-target"
                    >
                      {expandedStages.has(stage.id) 
                        ? 'Show less' 
                        : `Show ${stageCandidates.length - CANDIDATES_PER_STAGE_LIMIT} more candidates`
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

export default RecruitingKanbanBoard;