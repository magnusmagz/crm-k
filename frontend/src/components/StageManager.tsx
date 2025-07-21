import React, { useState } from 'react';
import { Stage } from '../types';
import { stagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

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

  const colors = [
    { name: 'Gray', value: '#6B7280' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' }
  ];

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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<Stage>) => {
    setIsLoading(true);
    try {
      await stagesAPI.update(stageId, updates);
      setStageList(stageList.map(s => s.id === stageId ? { ...s, ...updates } : s));
      setEditingStage(null);
      toast.success('Stage updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('Are you sure you want to delete this stage? Deals in this stage must be moved first.')) {
      return;
    }

    setIsLoading(true);
    try {
      await stagesAPI.delete(stageId);
      setStageList(stageList.filter(s => s.id !== stageId));
      toast.success('Stage deleted successfully');
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
      toast.success('Stages reordered successfully');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to reorder stages');
    } finally {
      setIsLoading(false);
    }
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newList = [...stageList];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newList.length) {
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      setStageList(newList);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Manage Pipeline Stages</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {stageList.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: stage.color }}
              />
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
                  className="flex-1 px-2 py-1 border border-gray-300 rounded"
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setEditingStage(stage.id);
                    setEditingName(stage.name);
                  }}
                >
                  {stage.name}
                </span>
              )}
              {stage.dealCount !== undefined && (
                <span className="text-sm text-gray-500">
                  ({stage.dealCount} {stage.dealCount === 1 ? 'deal' : 'deals'})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <select
                value={stage.color}
                onChange={(e) => handleUpdateStage(stage.id, { color: e.target.value })}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {colors.map(color => (
                  <option key={color.value} value={color.value}>
                    {color.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => moveStage(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => moveStage(index, 'down')}
                disabled={index === stageList.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ↓
              </button>

              <button
                onClick={() => handleDeleteStage(stage.id)}
                className="p-1 text-red-400 hover:text-red-600"
                disabled={!!(stage.dealCount && stage.dealCount > 0)}
                title={stage.dealCount && stage.dealCount > 0 ? 'Cannot delete stage with deals' : 'Delete stage'}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          placeholder="New stage name"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-gray-800 focus:border-gray-800"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddStage();
            }
          }}
        />
        <button
          onClick={handleAddStage}
          disabled={isLoading || !newStageName.trim()}
          className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReorder}
          disabled={isLoading}
          className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 disabled:opacity-50"
        >
          Save Order
        </button>
        <button
          onClick={() => {
            onUpdate();
            onClose();
          }}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default StageManager;