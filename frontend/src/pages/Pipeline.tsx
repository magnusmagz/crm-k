import React, { useState, useEffect } from 'react';
import { Stage, Deal } from '../types';
import { stagesAPI, dealsAPI } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import KanbanBoard from '../components/KanbanBoard';
import MobilePipeline from '../components/MobilePipeline';
import DealForm from '../components/DealForm';
import StageManager from '../components/StageManager';
import DealDebugModal from '../components/DealDebugModal';
import DealImport from '../components/DealImport';
import useDebounce from '../hooks/useDebounce';
import { CogIcon, PlusIcon, BugAntIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const Pipeline: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [debugDeal, setDebugDeal] = useState<Deal | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
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
  }, [debouncedSearchQuery, statusFilter]);

  const loadPipelineData = async () => {
    // Show searching indicator only if we have a search query
    if (debouncedSearchQuery) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
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

      // Load deals with filters
      const params: any = { 
        status: statusFilter,
        limit: 500 // Reasonable limit to prevent performance issues
      };
      
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }
      
      const dealsResponse = await dealsAPI.getAll(params);
      const filteredDeals = dealsResponse.data.deals;
      setDeals(filteredDeals);
      setAnalytics(dealsResponse.data.analytics);
    } catch (error: any) {
      toast.error('Failed to load pipeline data');
      console.error('Load pipeline error:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
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
      const response = await dealsAPI.updateStage(dealId, newStageId);
      
      // Update local deals state with the updated deal (includes status changes)
      if (response.data.deal) {
        setDeals(deals.map(deal => 
          deal.id === dealId ? response.data.deal : deal
        ));
        
        // Check if status changed to won/lost
        const updatedDeal = response.data.deal;
        if (updatedDeal.status === 'won') {
          toast.success('🎉 Deal won!');
        } else if (updatedDeal.status === 'lost') {
          toast('Deal marked as lost');
        }
      }
      
      // Reload to get updated analytics
      loadPipelineData();
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

  // Calculate won/lost totals from actual deals in view
  const calculateDisplayedAnalytics = () => {
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');
    const openDeals = deals.filter(d => d.status === 'open');
    
    const wonValue = wonDeals.reduce((sum, deal) => sum + (parseFloat(String(deal.value)) || 0), 0);
    const lostValue = lostDeals.reduce((sum, deal) => sum + (parseFloat(String(deal.value)) || 0), 0);
    const openValue = openDeals.reduce((sum, deal) => sum + (parseFloat(String(deal.value)) || 0), 0);
    
    return {
      won: wonDeals.length,
      wonValue,
      lost: lostDeals.length,
      lostValue,
      open: openDeals.length,
      openValue
    };
  };
  
  const displayedAnalytics = calculateDisplayedAnalytics();

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
        {/* Search and Filters */}
        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search deals or contacts..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {/* Searching indicator */}
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Deals</option>
                <option value="open">Open Deals</option>
                <option value="won">Won Deals</option>
                <option value="lost">Lost Deals</option>
              </select>
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  showFilters 
                    ? 'border-blue-500 text-blue-700 bg-blue-50' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
            </div>
          </div>
          
          {/* Advanced Filters (hidden by default) */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Advanced filters coming soon: date range, deal value, stage, and more!</p>
            </div>
          )}
          
          {/* Search Results Count */}
          {debouncedSearchQuery && !isSearching && (
            <div className="text-sm text-gray-600">
              Found {deals.length} {deals.length === 1 ? 'deal' : 'deals'} 
              {statusFilter !== 'all' && ` (${statusFilter} only)`}
            </div>
          )}
        </div>
        
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-mobile-2xl font-bold text-gray-900">Sales Pipeline</h1>
            <div className="mt-2 flex flex-wrap gap-mobile text-mobile-sm text-gray-600">
              <span>
                Total Pipeline: <span className="font-semibold text-gray-900">
                  {formatCurrency(displayedAnalytics.openValue)}
                </span>
              </span>
              <span>
                Open Deals: <span className="font-semibold text-gray-900">{displayedAnalytics.open}</span>
              </span>
              <span>
                Won: <span className="font-semibold text-green-600">
                  {displayedAnalytics.won} ({formatCurrency(displayedAnalytics.wonValue)})
                </span>
              </span>
              <span>
                Lost: <span className="font-semibold text-red-600">
                  {displayedAnalytics.lost} ({formatCurrency(displayedAnalytics.lostValue)})
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
              className="desktop-only inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowStageManager(true)}
              className="btn-mobile inline-flex items-center justify-center rounded-md border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <CogIcon className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Manage Stages</span>
              <span className="sm:hidden">Stages</span>
            </button>
            <button
              onClick={() => {
                setSelectedDeal(null);
                setShowDealForm(true);
              }}
              className="btn-mobile inline-flex items-center justify-center rounded-md border border-transparent bg-gray-800 font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden sm:inline">New Deal</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden md:block">
        <KanbanBoard
          stages={stages}
          deals={deals}
          onDealMove={handleDealMove}
          onDealClick={(deal) => {
            setSelectedDeal(deal);
            setShowDealForm(true);
          }}
          onDealDelete={handleDealDelete}
        />
      </div>

      {/* Mobile Pipeline */}
      <MobilePipeline
        stages={stages}
        deals={deals}
        onDealMove={handleDealMove}
        onDealClick={(deal) => {
          setSelectedDeal(deal);
          setShowDealForm(true);
        }}
        onDealDelete={handleDealDelete}
      />

      {/* Deal Form Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="modal-mobile bg-white shadow-xl overflow-y-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="modal-mobile bg-white shadow-xl overflow-y-auto sm:max-w-4xl">
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