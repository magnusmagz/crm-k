import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Stage, Deal, RecruitingPipeline, Position } from '../types';
import { stagesAPI, dealsAPI, recruitingAPI, positionsAPI, contactsAPI } from '../services/api';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import KanbanBoard from '../components/KanbanBoard';
import RecruitingKanbanBoard from '../components/RecruitingKanbanBoard';
import MobilePipeline from '../components/MobilePipeline';
import PullToRefresh from '../components/PullToRefresh';
import DealForm from '../components/DealForm';
import CandidateForm from '../components/CandidateForm';
import StageManager from '../components/StageManager';
import PositionManager from '../components/PositionManager';
import DealImport from '../components/DealImport';
import BulkOperations from '../components/BulkOperations';
import useDebounce from '../hooks/useDebounce';
import { useAppMode } from '../contexts/AppModeContext';
import { useAuth } from '../contexts/AuthContext';
import { CogIcon, PlusIcon, ArrowUpTrayIcon, FunnelIcon, CurrencyDollarIcon, ChartBarIcon, TrophyIcon, XCircleIcon, BriefcaseIcon, UserGroupIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const Pipeline: React.FC = () => {
  const { mode } = useAppMode();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  
  // Recruiting mode state
  const [recruitingPipelines, setRecruitingPipelines] = useState<RecruitingPipeline[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  
  // Filter states
  const searchQuery = searchParams.get('search') || '';
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>('all'); // 'all', 'me', or specific user ID
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isManager, setIsManager] = useState(false);
  
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
  
  // Bulk operations
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    fetchTeamMembers();
  }, []); // Fetch team members on mount

  useEffect(() => {
    loadPipelineData();
    fetchCustomFields();
  }, [debouncedSearchQuery, statusFilter, mode, selectedPosition, ownerFilter]); // Reload when filters change

  const fetchCustomFields = async () => {
    try {
      const response = await api.get('/custom-fields');
      const fields = response.data?.fields || response.data || [];
      setCustomFields(Array.isArray(fields) ? fields.filter((field: any) => field.entityType === 'deal') : []);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
      setCustomFields([]);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/users/team-members');
      setTeamMembers(response.data.teamMembers || []);
      setIsManager(true); // User is a manager if they can fetch team members
    } catch (error: any) {
      // Not a manager or error fetching team members
      console.log('Not a manager or failed to fetch team members');
      setIsManager(false);
      setTeamMembers([]);
    }
  };

  const loadPipelineData = async () => {
    // Show searching indicator only if we have a search query
    if (debouncedSearchQuery) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    try {
      if (mode === 'recruiting') {
        // Load recruiting stages
        const stagesResponse = await stagesAPI.getAll({ pipelineType: 'recruiting' });
        let stagesData = stagesResponse.data.stages;

        // Initialize default recruiting stages if none exist
        if (stagesData.length === 0) {
          const initResponse = await stagesAPI.initialize('recruiting');
          stagesData = initResponse.data.stages;
        }

        setStages(stagesData);

        // Load positions
        const positionsResponse = await positionsAPI.getAll({ status: 'open' });
        setPositions(positionsResponse.data.positions || []);

        // Load recruiting pipelines
        const params: any = { 
          limit: 500
        };
        
        if (selectedPosition) {
          params.positionId = selectedPosition;
        }
        
        if (debouncedSearchQuery) {
          params.search = debouncedSearchQuery;
        }
        
        const pipelinesResponse = await recruitingAPI.getAll(params);
        const pipelines = pipelinesResponse.data.pipelines || [];
        console.log(`Loaded ${pipelines.length} candidates for recruiting pipeline`);
        
        setRecruitingPipelines(pipelines);
        
        // Set analytics for recruiting
        setAnalytics(pipelinesResponse.data.analytics || {
          total: 0,
          totalValue: 0,
          open: 0,
          openValue: 0,
          won: 0,
          wonValue: 0,
          lost: 0,
          lostValue: 0
        });
      } else {
        // Original sales mode logic
        const stagesResponse = await stagesAPI.getAll({ pipelineType: 'sales' });
        let stagesData = stagesResponse.data.stages;

        // Initialize default stages if none exist
        if (stagesData.length === 0) {
          const initResponse = await stagesAPI.initialize('sales');
          stagesData = initResponse.data.stages;
        }

        setStages(stagesData);

        // Load deals with filters
        const params: any = {
          status: statusFilter,
          limit: 500
        };

        if (debouncedSearchQuery) {
          params.search = debouncedSearchQuery;
        }

        // Add owner filter if not 'all'
        if (ownerFilter === 'me' && user?.id) {
          // Filter to show only my deals
          params.ownerId = user.id;
        } else if (ownerFilter !== 'all' && ownerFilter !== 'me') {
          // Filter to specific team member
          params.ownerId = ownerFilter;
        }
        // If 'all', don't send ownerId (backend will show all team deals for managers)

        const dealsResponse = await dealsAPI.getAll(params);
        const filteredDeals = dealsResponse.data.deals;
        setDeals(filteredDeals);
        setAnalytics(dealsResponse.data.analytics);
      }
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

  // Recruiting mode handlers
  const handleCandidateMove = async (candidateId: string, newStageId: string) => {
    try {
      const response = await recruitingAPI.moveCandidate(candidateId, newStageId);
      
      if (response.data.pipeline) {
        setRecruitingPipelines(recruitingPipelines.map(pipeline => 
          pipeline.id === candidateId ? response.data.pipeline : pipeline
        ));
        
        // Check if status changed
        const updatedPipeline = response.data.pipeline;
        if (updatedPipeline.status === 'hired') {
          toast.success('🎉 Candidate hired!');
        } else if (updatedPipeline.status === 'rejected') {
          toast('Candidate marked as rejected');
        }
      }
      
      loadPipelineData();
    } catch (error: any) {
      toast.error('Failed to move candidate');
      loadPipelineData();
    }
  };

  const handleCandidateClick = async (pipeline: RecruitingPipeline) => {
    try {
      // Fetch full pipeline data with associations
      const response = await recruitingAPI.getById(pipeline.id);
      setSelectedCandidate(response.data);
      setShowCandidateForm(true);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      toast.error('Failed to load candidate details');
    }
  };
  
  const handleCandidateCreate = async (data: any) => {
    try {
      console.log('Creating candidate with data:', data);
      
      // First, create or update the contact
      let contactId = data.candidate.candidateId;
      
      if (!contactId) {
        // Create new contact - store recruiting-specific fields in customFields
        const contactData: any = {
          firstName: data.candidate.firstName || '',
          lastName: data.candidate.lastName || '',
          source: 'Recruiting',
          customFields: {
            linkedinUrl: data.candidate.linkedinUrl || '',
            githubUrl: data.candidate.githubUrl || '',
            experienceYears: data.candidate.experienceYears || 0,
            skills: data.candidate.skills || [],
            salaryExpectation: data.candidate.salaryExpectation || null
          }
        };
        
        // Only add optional fields if they have values
        if (data.candidate.email) {
          contactData.email = data.candidate.email;
        }
        if (data.candidate.phone) {
          contactData.phone = data.candidate.phone;
        }
        if (data.candidate.currentEmployer) {
          contactData.company = data.candidate.currentEmployer;
        }
        if (data.candidate.currentRole) {
          contactData.position = data.candidate.currentRole;
        }
        
        // Validate required fields
        if (!contactData.firstName || !contactData.lastName) {
          throw new Error('First name and last name are required');
        }
        
        console.log('Sending contact data:', contactData);
        const contactResponse = await contactsAPI.create(contactData);
        console.log('Contact created:', contactResponse.data);
        contactId = contactResponse.data.contact.id;
      }
      
      // Add candidate to recruiting pipeline
      console.log('Adding to pipeline with data:', {
        candidateId: contactId,
        ...data.pipeline
      });
      
      const addResponse = await recruitingAPI.addCandidate({
        candidateId: contactId,
        ...data.pipeline
      });
      
      console.log('Candidate added response:', addResponse.data);
      
      setShowCandidateForm(false);
      toast.success('Candidate added to pipeline');
      
      // Force a reload of the pipeline data
      console.log('Reloading pipeline data after adding candidate...');
      await loadPipelineData();
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        const validationErrors = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
        toast.error(validationErrors);
      } else {
        const errorMessage = error.response?.data?.details || 
                            error.response?.data?.error || 
                            error.response?.data?.message || 
                            'Failed to add candidate';
        console.error('Error details:', error.response?.data?.details);
        toast.error(errorMessage);
      }
    }
  };
  
  const handleCandidateUpdate = async (pipelineId: string, data: any) => {
    try {
      // Update contact information - store recruiting-specific fields in customFields
      if (data.candidate.candidateId) {
        await contactsAPI.update(data.candidate.candidateId, {
          firstName: data.candidate.firstName,
          lastName: data.candidate.lastName,
          email: data.candidate.email,
          phone: data.candidate.phone,
          company: data.candidate.currentEmployer, // Map to existing company field
          position: data.candidate.currentRole,     // Map to existing position field
          customFields: {
            linkedinUrl: data.candidate.linkedinUrl,
            githubUrl: data.candidate.githubUrl,
            experienceYears: data.candidate.experienceYears,
            skills: data.candidate.skills,
            salaryExpectation: data.candidate.salaryExpectation
          }
        });
      }
      
      // Update pipeline information
      await recruitingAPI.update(pipelineId, data.pipeline);
      
      setSelectedCandidate(null);
      setShowCandidateForm(false);
      toast.success('Candidate updated successfully');
      loadPipelineData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update candidate');
    }
  };

  const handleCandidateDelete = async (candidateId: string) => {
    if (!window.confirm('Are you sure you want to remove this candidate from the pipeline?')) {
      return;
    }

    try {
      await recruitingAPI.remove(candidateId);
      setRecruitingPipelines(recruitingPipelines.filter(p => p.id !== candidateId));
      toast.success('Candidate removed from pipeline');
      loadPipelineData();
    } catch (error: any) {
      toast.error('Failed to remove candidate');
    }
  };

  const formatCurrency = (value: number) => {
    // Ensure value is a valid number
    const numValue = isNaN(value) ? 0 : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  // Bulk selection functions
  const toggleDealSelection = (dealId: string) => {
    const newSelected = new Set(selectedDeals);
    if (newSelected.has(dealId)) {
      newSelected.delete(dealId);
    } else {
      newSelected.add(dealId);
    }
    setSelectedDeals(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDeals.size === deals.length) {
      setSelectedDeals(new Set());
    } else {
      setSelectedDeals(new Set(deals.map(d => d.id)));
    }
  };

  const clearSelection = () => {
    setSelectedDeals(new Set());
  };

  // Use API analytics for accurate totals, not just visible deals
  // calculateDisplayedAnalytics would only count filtered deals, missing won/lost deals when filtered

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        {/* Filters */}
        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter Controls */}
            <div className="flex gap-2">
              {/* Status Filter - Only show in sales mode */}
              {mode === 'sales' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="all">All Deals</option>
                  <option value="open">Open Deals</option>
                  <option value="won">Won Deals</option>
                  <option value="lost">Lost Deals</option>
                </select>
              )}

              {/* Owner Filter - Only show in sales mode for managers */}
              {mode === 'sales' && isManager && teamMembers.length > 0 && (
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="all">All Team Members</option>
                  <option value="me">My Deals Only</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              )}

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  showFilters 
                    ? 'border-primary text-primary bg-gray-50' 
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
        
        <div className="mb-6">
          <h1 className="text-mobile-2xl font-bold text-primary-dark mb-6">
            {mode === 'recruiting' ? 'Recruiting Pipeline' : 'Sales Pipeline'}
          </h1>
          
          {/* Position selector for recruiting mode */}
          {mode === 'recruiting' && (
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Position:</label>
              <select
                value={selectedPosition || ''}
                onChange={(e) => setSelectedPosition(e.target.value || null)}
                className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              >
                <option value="">All Positions</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title} - {position.department}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {mode === 'recruiting' ? (
              <>
                {/* Active Candidates Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
                      <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Active Candidates</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-primary-dark">
                      {recruitingPipelines.filter(p => p.status === 'active').length}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      In pipeline
                    </p>
                  </div>
                </div>

                {/* Open Positions Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
                      <BriefcaseIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Open Positions</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-primary-dark">
                      {positions.length}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      Hiring for
                    </p>
                  </div>
                </div>

                {/* Hired Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-200">
                      <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Hired</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-green-600">
                      {recruitingPipelines.filter(p => p.status === 'hired').length}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      This month
                    </p>
                  </div>
                </div>

                {/* Pass Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
                      <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Pass</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-gray-600">
                      {recruitingPipelines.filter(p => p.status === 'passed').length}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      Not a fit
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Total Pipeline Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
                      <CurrencyDollarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Total Pipeline</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-primary-dark">
                      {formatCurrency(analytics.openValue || 0)}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      {analytics.open || 0} open {analytics.open === 1 ? 'deal' : 'deals'}
                    </p>
                  </div>
                </div>

                {/* Open Deals Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors duration-200">
                  <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-mobile-xs sm:text-sm text-gray-600">Open Deals</p>
                <p className="text-mobile-xl sm:text-2xl font-bold text-primary-dark">
                  {analytics.open || 0}
                </p>
                <p className="text-mobile-xs sm:text-sm text-gray-500">
                  Active opportunities
                </p>
              </div>
            </div>

            {/* Won Deals Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-200">
                  <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-mobile-xs sm:text-sm text-gray-600">Won Deals</p>
                <p className="text-mobile-xl sm:text-2xl font-bold text-green-600">
                  {analytics.won || 0}
                </p>
                <p className="text-mobile-xs sm:text-sm text-gray-500">
                  {formatCurrency(analytics.wonValue || 0)}
                </p>
              </div>
            </div>

                {/* Lost Deals Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors duration-200">
                      <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mobile-xs sm:text-sm text-gray-600">Lost Deals</p>
                    <p className="text-mobile-xl sm:text-2xl font-bold text-red-600">
                      {analytics.lost || 0}
                    </p>
                    <p className="text-mobile-xs sm:text-sm text-gray-500">
                      {formatCurrency(analytics.lostValue || 0)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="mt-4 sm:mt-0 sm:flex-none flex gap-3">
            {mode === 'recruiting' && (
              <button
                onClick={() => setShowPositionManager(true)}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 px-4 py-2 text-sm"
              >
                <BriefcaseIcon className="-ml-1 mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Manage Positions</span>
                <span className="sm:hidden">Positions</span>
              </button>
            )}
            {mode === 'sales' && (
              <Link
                to="/custom-fields?tab=deal"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" />
                Custom Fields
              </Link>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="desktop-only inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowStageManager(true)}
              className="btn-mobile inline-flex items-center justify-center rounded-md border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <CogIcon className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Manage Stages</span>
              <span className="sm:hidden">Stages</span>
            </button>
            <button
              onClick={() => {
                if (mode === 'recruiting') {
                  setSelectedCandidate(null);
                  setShowCandidateForm(true);
                } else {
                  setSelectedDeal(null);
                  setShowDealForm(true);
                }
              }}
              className="btn-mobile inline-flex items-center justify-center rounded-md border border-transparent bg-primary font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden sm:inline">New {mode === 'recruiting' ? 'Candidate' : 'Deal'}</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden md:block">
        {mode === 'recruiting' ? (
          <RecruitingKanbanBoard
            stages={stages}
            pipelines={recruitingPipelines}
            onCandidateMove={handleCandidateMove}
            onCandidateClick={handleCandidateClick}
            onCandidateDelete={handleCandidateDelete}
            selectedCandidates={new Set()} // TODO: Implement selection for recruiting
            onCandidateToggleSelect={undefined}
          />
        ) : (
          <KanbanBoard
            stages={stages}
            deals={deals}
            onDealMove={handleDealMove}
            onDealClick={(deal) => {
              setSelectedDeal(deal);
              setShowDealForm(true);
            }}
            onDealDelete={handleDealDelete}
            selectedDeals={selectedDeals}
            onDealToggleSelect={toggleDealSelection}
          />
        )}
      </div>

      {/* Mobile Pipeline with Pull-to-Refresh */}
      <div className="md:hidden">
        <PullToRefresh onRefresh={loadPipelineData}>
          <MobilePipeline
            stages={stages}
            deals={deals}
            onDealMove={handleDealMove}
            onDealClick={(deal) => {
              setSelectedDeal(deal);
              setShowDealForm(true);
            }}
            onDealDelete={handleDealDelete}
            selectedDeals={selectedDeals}
            onDealToggleSelect={toggleDealSelection}
          />
        </PullToRefresh>
      </div>

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
              pipelineType={mode as 'sales' | 'recruiting'}
            />
          </div>
        </div>
      )}

      {/* Position Manager Modal */}
      {showPositionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="modal-mobile bg-white shadow-xl overflow-y-auto sm:max-w-4xl">
            <PositionManager
              onUpdate={loadPipelineData}
              onClose={() => setShowPositionManager(false)}
            />
          </div>
        </div>
      )}


      {/* Import Modal */}
      {showImport && (
        <DealImport onClose={() => {
          setShowImport(false);
          loadPipelineData();
        }} />
      )}

      {/* Candidate Form Modal */}
      {showCandidateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:p-4">
          <div className="modal-mobile bg-white shadow-xl overflow-y-auto">
            <CandidateForm
              pipeline={selectedCandidate}
              positions={positions}
              stages={stages.filter(s => s.pipelineType === 'recruiting')}
              onSubmit={selectedCandidate 
                ? (data) => handleCandidateUpdate(selectedCandidate.id, data)
                : handleCandidateCreate
              }
              onClose={() => {
                setShowCandidateForm(false);
                setSelectedCandidate(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Bulk Operations */}
      <BulkOperations
        entityType="deals"
        selectedItems={selectedDeals}
        allItems={deals}
        onClearSelection={clearSelection}
        onRefresh={loadPipelineData}
        customFields={customFields}
        stages={stages}
      />

      <Toaster position="top-right" />
    </div>
  );
};

export default Pipeline;