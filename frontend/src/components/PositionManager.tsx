import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { Position } from '../types';
import { positionsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface PositionManagerProps {
  onUpdate: () => void;
  onClose: () => void;
}

const PositionManager: React.FC<PositionManagerProps> = ({ onUpdate, onClose }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'full-time' | 'part-time' | 'contract' | 'internship'>('full-time');
  const [remote, setRemote] = useState<'onsite' | 'remote' | 'hybrid'>('onsite');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [requirements, setRequirements] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'open' | 'closed' | 'on-hold'>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    setIsLoading(true);
    try {
      const response = await positionsAPI.getAll();
      setPositions(response.data.positions || []);
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDepartment('');
    setLocation('');
    setType('full-time');
    setRemote('onsite');
    setSalaryMin('');
    setSalaryMax('');
    setRequirements('');
    setDescription('');
    setStatus('open');
    setEditingPosition(null);
    setShowForm(false);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setTitle(position.title);
    setDepartment(position.department || '');
    setLocation(position.location || '');
    setType(position.type || 'full-time');
    setRemote(position.remote || 'onsite');
    setSalaryMin(position.salaryRange?.min?.toString() || '');
    setSalaryMax(position.salaryRange?.max?.toString() || '');
    setRequirements(position.requirements || '');
    setDescription(position.description || '');
    setStatus(position.status || 'open');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Position title is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const positionData = {
        title: title.trim(),
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        type,
        remote,
        salaryRange: (salaryMin || salaryMax) ? {
          min: salaryMin ? parseInt(salaryMin) : undefined,
          max: salaryMax ? parseInt(salaryMax) : undefined
        } : undefined,
        requirements: requirements.trim() || undefined,
        description: description.trim() || undefined,
        status
      };

      if (editingPosition) {
        await positionsAPI.update(editingPosition.id, positionData);
        toast.success('Position updated successfully');
      } else {
        await positionsAPI.create(positionData);
        toast.success('Position created successfully');
      }

      resetForm();
      await loadPositions();
      onUpdate();
    } catch (error: any) {
      console.error('Error saving position:', error);
      toast.error(error.response?.data?.message || 'Failed to save position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (positionId: string) => {
    if (!window.confirm('Are you sure you want to delete this position? This will not affect existing candidates.')) {
      return;
    }

    try {
      await positionsAPI.delete(positionId);
      toast.success('Position deleted successfully');
      await loadPositions();
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting position:', error);
      toast.error(error.response?.data?.message || 'Failed to delete position');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'full-time':
        return 'Full-Time';
      case 'part-time':
        return 'Part-Time';
      case 'contract':
        return 'Contract';
      case 'internship':
        return 'Internship';
      default:
        return type;
    }
  };

  const getRemoteLabel = (remote: string) => {
    switch (remote) {
      case 'onsite':
        return 'On-site';
      case 'remote':
        return 'Remote';
      case 'hybrid':
        return 'Hybrid';
      default:
        return remote;
    }
  };

  const formatSalaryRange = (salaryRange?: any) => {
    if (!salaryRange) return 'Not specified';
    const min = salaryRange.min ? `$${salaryRange.min.toLocaleString()}` : '';
    const max = salaryRange.max ? `$${salaryRange.max.toLocaleString()}` : '';
    if (min && max) return `${min} - ${max}`;
    if (min) return `From ${min}`;
    if (max) return `Up to ${max}`;
    return 'Not specified';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BriefcaseIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary-dark">
            Manage Positions
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {!showForm ? (
          <>
            {/* Add Position Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Position
              </button>
            </div>

            {/* Positions List */}
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No positions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new position.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Position
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-primary-dark">
                            {position.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(position.status)}`}>
                            {position.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          {position.department && (
                            <div>
                              <span className="font-medium">Department:</span> {position.department}
                            </div>
                          )}
                          {position.location && (
                            <div>
                              <span className="font-medium">Location:</span> {position.location}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Type:</span> {getTypeLabel(position.type)}
                          </div>
                          <div>
                            <span className="font-medium">Remote:</span> {getRemoteLabel(position.remote)}
                          </div>
                          <div>
                            <span className="font-medium">Salary:</span> {formatSalaryRange(position.salaryRange)}
                          </div>
                        </div>
                        
                        {position.description && (
                          <div className="mt-3 text-sm text-gray-600">
                            <p className="line-clamp-2">{position.description}</p>
                          </div>
                        )}
                        
                        {position.requirements && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Requirements:</span>
                            <p className="mt-1 whitespace-pre-line line-clamp-2">{position.requirements}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(position)}
                          className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(position.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Position Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-dark">
                {editingPosition ? 'Edit Position' : 'New Position'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Location
                </label>
                <select
                  value={remote}
                  onChange={(e) => setRemote(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="onsite">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g., 120000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Salary
                </label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g., 180000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Describe the role, responsibilities, and what you're looking for..."
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="List the required skills, experience, and qualifications..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingPosition ? 'Update Position' : 'Create Position'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PositionManager;