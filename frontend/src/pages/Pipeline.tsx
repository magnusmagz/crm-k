import React, { useState, useEffect } from 'react';
import { Stage, Deal } from '../types';
import { stagesAPI, dealsAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import KanbanBoard from '../components/KanbanBoard';
import DealForm from '../components/DealForm';
import StageManager from '../components/StageManager';
import DealDebugModal from '../components/DealDebugModal';
import DealImport from '../components/DealImport';
import { CogIcon, PlusIcon, BugAntIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const Pipeline: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [debugDeal, setDebugDeal] = useState<Deal | null>(null);
  const [analytics, setAnalytics] = useState({
    total: 0,
    totalValue: 0,
    open: 0,
    openValue: 0,
    won: 0,
    wonValue: 0,
    lost: 0,
    lostValue: 0
  });

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    setIsLoading(true);
    try {
      // Load stages first
      const stagesResponse = await stagesAPI.getAll();
      let stagesData = stagesResponse.data.stages;

      // Initialize default stages if none exist
      if (stagesData.length === 0) {
        const initResponse = await stagesAPI.initialize();
        stagesData = initResponse.data.stages;
      }

      setStages(stagesData);

      // Load deals
      const dealsResponse = await dealsAPI.getAll({ status: 'all' });
      const allDeals = dealsResponse.data.deals;
      setDeals(allDeals);
      setAnalytics(dealsResponse.data.analytics);
    } catch (error: any) {
      toast.error('Failed to load pipeline data');
      console.error('Load pipeline error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDealCreate = async (dealData: any) => {
    try {
      await dealsAPI.create(dealData);
      setShowDealForm(false);
      toast.success('Deal created successfully');
      loadPipelineData(); // Reload to get updated analytics and Contact data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create deal');
    }
  };

  const handleDealUpdate = async (dealId: string, dealData: any) => {
    try {
      await dealsAPI.update(dealId, dealData);
      setSelectedDeal(null);
      setShowDealForm(false);
      toast.success('Deal updated successfully');
      loadPipelineData(); // Reload to get updated analytics and Contact data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update deal');
    }
  };

  const handleDealMove = async (dealId: string, newStageId: string) => {
    try {
      await dealsAPI.updateStage(dealId, newStageId);
      setDeals(deals.map(deal => 
        deal.id === dealId ? { ...deal, stageId: newStageId } : deal
      ));
      loadPipelineData(); // Reload to get updated stage totals
    } catch (error: any) {
      toast.error('Failed to move deal');
      loadPipelineData(); // Reload to revert on error
    }
  };

  const handleDealDelete = async (dealId: string) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) {
      return;
    }

    try {
      await dealsAPI.delete(dealId);
      setDeals(deals.filter(d => d.id !== dealId));
      toast.success('Deal deleted successfully');
      loadPipelineData(); // Reload to get updated analytics
    } catch (error: any) {
      toast.error('Failed to delete deal');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
            <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
              <span>
                Total Pipeline: <span className="font-semibold text-gray-900">
                  {formatCurrency(analytics.openValue)}
                </span>
              </span>
              <span>
                Open Deals: <span className="font-semibold text-gray-900">{analytics.open}</span>
              </span>
              <span>
                Won: <span className="font-semibold text-green-600">
                  {formatCurrency(analytics.wonValue)}
                </span>
              </span>
              <span>
                Lost: <span className="font-semibold text-red-600">
                  {formatCurrency(analytics.lostValue)}
                </span>
              </span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
            {deals.length > 0 && (
              <div className="relative inline-block">
                <select
                  value=""
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue) {
                      const dealToDebug = deals.find(d => d.id === selectedValue);
                      if (dealToDebug) {
                        setDebugDeal(dealToDebug);
                        setShowDebugModal(true);
                      }
                    }
                  }}
                  className="appearance-none rounded-md border border-yellow-300 bg-yellow-50 pl-3 pr-10 py-2 text-sm font-medium text-yellow-800 shadow-sm hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 cursor-pointer"
                >
                  <option value="">🐛 Debug Deal...</option>
                  <optgroup label="Open Deals">
                    {deals.filter(d => d.status === 'open').map(deal => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name} - {deal.Stage?.name || 'No Stage'}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Won Deals">
                    {deals.filter(d => d.status === 'won').map(deal => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name} (Won)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lost Deals">
                    {deals.filter(d => d.status === 'lost').map(deal => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name} (Lost)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-yellow-800">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowStageManager(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <CogIcon className="-ml-1 mr-2 h-5 w-5" />
              Manage Stages
            </button>
            <button
              onClick={() => {
                setSelectedDeal(null);
                setShowDealForm(true);
              }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Deal
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        stages={stages}
        deals={deals.filter(d => d.status === 'open')}
        onDealMove={handleDealMove}
        onDealClick={(deal) => {
          setSelectedDeal(deal);
          setShowDealForm(true);
        }}
        onDealDelete={handleDealDelete}
      />

      {/* Deal Form Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <DealForm
              deal={selectedDeal}
              stages={stages}
              onSubmit={selectedDeal 
                ? (data) => handleDealUpdate(selectedDeal.id, data)
                : handleDealCreate
              }
              onClose={() => {
                setShowDealForm(false);
                setSelectedDeal(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Stage Manager Modal */}
      {showStageManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <StageManager
              stages={stages}
              onUpdate={loadPipelineData}
              onClose={() => setShowStageManager(false)}
            />
          </div>
        </div>
      )}

      {/* Debug Modal */}
      <DealDebugModal
        isOpen={showDebugModal}
        onClose={() => {
          setShowDebugModal(false);
          setDebugDeal(null);
        }}
        deal={debugDeal}
      />

      {/* Import Modal */}
      {showImport && (
        <DealImport onClose={() => {
          setShowImport(false);
          loadPipelineData();
        }} />
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default Pipeline;