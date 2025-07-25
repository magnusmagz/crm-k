import React, { useState, useEffect } from 'react';
import { Stage } from '../types';
import { stagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface StageManagerProps {
  stages: Stage[];
  onUpdate: () => void;
  onClose: () => void;
}

const StageManager: React.FC<StageManagerProps> = ({ stages, onUpdate, onClose }) => {
  const [stageList, setStageList] = useState<Stage[]>([...stages]);
  const [newStageName, setNewStageName] = useState('');
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedStage, setDraggedStage] = useState<Stage | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const colors = [
    { name: 'Gray', value: '#6B7280' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  // Track if order has changed
  useEffect(() => {
    const orderChanged = stageList.some((stage, index) => {
      const originalStage = stages.find(s => s.id === stage.id);
      return originalStage && originalStage.order !== index;
    });
    setHasChanges(orderChanged);
  }, [stageList, stages]);

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error('Stage name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await stagesAPI.create({
        name: newStageName,
        color: colors[stageList.length % colors.length].value
      });
      setStageList([...stageList, response.data.stage]);
      setNewStageName('');
      toast.success('Stage added successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<Stage>) => {
    const stage = stageList.find(s => s.id === stageId);
    
    // Frontend check for system stages
    if (stage && (stage.name === 'Closed Won' || stage.name === 'Closed Lost') && updates.name && updates.name !== stage.name) {
      toast.error('System stages cannot be renamed');
      setEditingStage(null);
      return;
    }
    
    setIsLoading(true);
    try {
      await stagesAPI.update(stageId, updates);
      setStageList(stageList.map(s => s.id === stageId ? { ...s, ...updates } : s));
      setEditingStage(null);
      toast.success('Stage updated');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    const stage = stageList.find(s => s.id === stageId);
    
    // Protect system-critical stages
    if (stageName === 'Closed Won' || stageName === 'Closed Lost') {
      toast.error(`Cannot delete "${stageName}" - this is a system stage required for deal closure`);
      return;
    }
    
    if (stage?.dealCount && stage.dealCount > 0) {
      toast.error(`Cannot delete "${stageName}" - it contains ${stage.dealCount} deal${stage.dealCount > 1 ? 's' : ''}`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the "${stageName}" stage?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await stagesAPI.delete(stageId);
      setStageList(stageList.filter(s => s.id !== stageId));
      toast.success('Stage deleted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async () => {
    const reorderedStages = stageList.map((stage, index) => ({
      id: stage.id,
      order: index
    }));

    setIsLoading(true);
    try {
      await stagesAPI.reorder(reorderedStages);
      toast.success('Stage order saved');
      setHasChanges(false);
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to save stage order');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, stage: Stage, index: number) => {
    setDraggedStage(stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStage) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedStage) return;

    const draggedIndex = stageList.findIndex(s => s.id === draggedStage.id);
    if (draggedIndex === dropIndex) {
      setDraggedStage(null);
      setDragOverIndex(null);
      return;
    }

    const newList = [...stageList];
    newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedStage);
    
    setStageList(newList);
    setDraggedStage(null);
    setDragOverIndex(null);
  };

  const moveStage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= stageList.length) return;
    
    const newList = [...stageList];
    const [movedStage] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, movedStage);
    setStageList(newList);
  };

  return (
    <div className="p-mobile max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-mobile-lg font-semibold text-gray-900">Manage Pipeline Stages</h3>
          <p className="text-mobile-sm text-gray-500 mt-1">
        <span className="hidden sm:inline">Drag stages to reorder, click to edit names</span>
        <span className="sm:hidden">Use arrows to reorder, tap to edit</span>
      </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 transition-colors touch-target flex items-center justify-center"
        >
          <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Stages List */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
        {stageList.map((stage, index) => (
          <div
            key={stage.id}
            draggable
            onDragStart={(e) => handleDragStart(e, stage, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`group relative bg-white border rounded-lg p-3 sm:p-4 sm:cursor-move transition-all ${
              dragOverIndex === index ? 'border-blue-500 shadow-lg transform scale-105' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          >
            {/* Drag Handle - Desktop Only */}
            <div className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM7 18a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 414 0zM17 18a2 2 0 11-4 0 2 2 0 414 0z" />
              </svg>
            </div>
            
            {/* Mobile Reorder Buttons */}
            <div className="sm:hidden absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
              <button
                onClick={() => moveStage(index, index - 1)}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed touch-target flex items-center justify-center"
                title="Move up"
              >
                <ChevronUpIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveStage(index, index + 1)}
                disabled={index === stageList.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed touch-target flex items-center justify-center"
                title="Move down"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="ml-12 sm:ml-8">
              {/* Stage Info Row */}
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                {/* Color Indicator */}
                <div
                  className="w-6 h-6 rounded flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                
                {/* Stage Name */}
                <div className="flex-1 min-w-0">
                {editingStage === stage.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim() && editingName !== stage.name) {
                        handleUpdateStage(stage.id, { name: editingName });
                      } else {
                        setEditingStage(null);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (editingName.trim() && editingName !== stage.name) {
                          handleUpdateStage(stage.id, { name: editingName });
                        } else {
                          setEditingStage(null);
                        }
                      }
                    }}
                    className="w-full px-3 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <div
                    className={`flex items-center gap-2 px-3 py-1 -mx-3 -my-1 rounded ${
                      stage.name === 'Closed Won' || stage.name === 'Closed Lost'
                        ? 'cursor-not-allowed'
                        : 'cursor-text hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (stage.name !== 'Closed Won' && stage.name !== 'Closed Lost') {
                        setEditingStage(stage.id);
                        setEditingName(stage.name);
                      }
                    }}
                    title={
                      stage.name === 'Closed Won' || stage.name === 'Closed Lost'
                        ? 'System stages cannot be renamed'
                        : 'Click to rename stage'
                    }
                  >
                    <span className="font-medium text-mobile-base">{stage.name}</span>
                    {(stage.name === 'Closed Won' || stage.name === 'Closed Lost') && (
                      <span className="text-mobile-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        System
                      </span>
                    )}
                    {stage.dealCount !== undefined && stage.dealCount > 0 && (
                      <span className="text-mobile-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {stage.dealCount} {stage.dealCount === 1 ? 'deal' : 'deals'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Row - Mobile: Stack below, Desktop: Inline */}
              <div className="flex items-center gap-2 sm:gap-3 ml-9 sm:ml-0 sm:mt-3">
                {/* Color Dropdown */}
                <select
                  value={stage.color}
                  onChange={(e) => handleUpdateStage(stage.id, { color: e.target.value })}
                  className="text-mobile-sm border border-gray-300 rounded px-2 py-1 touch-target flex-1 sm:flex-initial"
                  aria-label="Stage color"
                >
                  {colors.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteStage(stage.id, stage.name)}
                  className={`p-2 rounded transition-all touch-target flex items-center justify-center ${
                    stage.name === 'Closed Won' || stage.name === 'Closed Lost'
                      ? 'text-gray-300 cursor-not-allowed'
                      : stage.dealCount && stage.dealCount > 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  disabled={!!(stage.name === 'Closed Won' || stage.name === 'Closed Lost' || (stage.dealCount && stage.dealCount > 0))}
                  title={
                    stage.name === 'Closed Won' || stage.name === 'Closed Lost' 
                      ? 'System stage - required for deal closure' 
                      : stage.dealCount && stage.dealCount > 0 
                      ? 'Cannot delete stage with deals' 
                      : 'Delete stage'
                  }
                  aria-label="Delete stage"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Stage */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="Enter new stage name..."
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-mobile-base"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newStageName.trim()) {
                handleAddStage();
              }
            }}
          />
          <button
            onClick={handleAddStage}
            disabled={isLoading || !newStageName.trim()}
            className="btn-mobile inline-flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Stage</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {hasChanges && (
          <button
            onClick={handleReorder}
            disabled={isLoading}
            className="btn-mobile flex-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium order-2 sm:order-1"
          >
            <CheckIcon className="h-5 w-5" />
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Order Changes</span>
          </button>
        )}
        <button
          onClick={() => {
            onUpdate();
            onClose();
          }}
          className={`btn-mobile ${hasChanges ? 'flex-1' : 'w-full'} bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium order-1 sm:order-2`}
        >
          {hasChanges ? <span><span className="hidden sm:inline">Close Without Saving</span><span className="sm:hidden">Cancel</span></span> : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default StageManager;