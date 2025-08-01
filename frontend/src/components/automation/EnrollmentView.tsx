import React, { useState, useEffect } from 'react';
import { EnrollmentSummary, Contact, Deal } from '../../types';
import { automationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { UserIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';

interface EnrollmentViewProps {
  automationId: string;
  isActive: boolean;
}

const EnrollmentView: React.FC<EnrollmentViewProps> = ({ automationId, isActive }) => {
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null);
  const [enrolledEntities, setEnrolledEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    fetchEnrollments();
  }, [automationId]);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const response = await automationsAPI.getEnrollments(automationId);
      console.log('Enrollment response:', response.data);
      setSummary(response.data.summary);
      setEnrolledEntities(response.data.enrolledEntities || []);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await automationsAPI.previewEnrollment(automationId);
      setPreviewData(response.data);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to preview enrollment');
    }
  };

  const handleUnenroll = async (entityType: string, entityId: string) => {
    if (!window.confirm('Are you sure you want to unenroll this entity?')) return;

    try {
      await automationsAPI.unenroll(automationId, entityType as 'contact' | 'deal', entityId);
      toast.success('Entity unenrolled successfully');
      fetchEnrollments();
    } catch (error) {
      toast.error('Failed to unenroll entity');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ArrowPathIcon className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-primary-dark">{summary.total}</div>
          <div className="text-sm text-gray-500">Total Enrolled</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
          <div className="text-2xl font-bold text-primary">{summary.active}</div>
          <div className="text-sm text-blue-700">Active</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
          <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
          <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
          <div className="text-sm text-red-700">Failed</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{summary.unenrolled}</div>
          <div className="text-sm text-gray-700">Unenrolled</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-primary-dark">Enrolled Entities</h3>
        <button
          onClick={handlePreview}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          Preview Enrollment
        </button>
      </div>

      {/* Enrolled Entities List */}
      {enrolledEntities.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No entities currently enrolled</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {enrolledEntities.map((item) => (
              <li key={item.enrollment.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {item.type === 'contact' ? (
                        <UserIcon className="h-8 w-8 text-gray-400" />
                      ) : (
                        <CurrencyDollarIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-primary-dark">
                        {item.type === 'contact' 
                          ? `${item.entity.firstName} ${item.entity.lastName}`
                          : item.entity.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.type === 'contact' 
                          ? item.entity.email
                          : `$${item.entity.value.toLocaleString()}`}
                      </div>
                      <div className="mt-1 flex items-center text-xs text-gray-400">
                        <span className="flex items-center mr-3">
                          {getStatusIcon(item.enrollment.status)}
                          <span className="ml-1">{item.enrollment.status}</span>
                        </span>
                        <span>
                          Step {item.enrollment.currentStepIndex + 1}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          Enrolled {new Date(item.enrollment.enrolledAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.enrollment.status === 'active' && (
                    <button
                      onClick={() => handleUnenroll(item.type, item.entity.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Unenroll
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              Enrollment Preview - {previewData.potentialCount} Potential Enrollments
            </h3>
            <div className="space-y-2">
              {previewData.preview.map((item: any, index: number) => (
                <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                  {item.type === 'contact' ? (
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  ) : (
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  )}
                  <span className="text-sm">
                    {item.type === 'contact' 
                      ? `${item.entity.firstName} ${item.entity.lastName}`
                      : item.entity.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentView;