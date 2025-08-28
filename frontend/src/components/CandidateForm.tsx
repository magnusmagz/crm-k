import React, { useState, useEffect } from 'react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Contact, Position, Stage, RecruitingPipeline } from '../types';
import { contactsAPI, positionsAPI, stagesAPI, recruitingAPI } from '../services/api';
import toast from 'react-hot-toast';

interface CandidateFormProps {
  pipeline?: RecruitingPipeline & {
    candidate?: Contact;
    Position?: Position;
    Stage?: Stage;
  };
  positions: Position[];
  stages: Stage[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const CandidateForm: React.FC<CandidateFormProps> = ({
  pipeline,
  positions,
  stages,
  onSubmit,
  onClose
}) => {
  const isEditMode = !!pipeline;
  const candidateInfo = pipeline?.candidate;
  
  // Contact Information
  const [firstName, setFirstName] = useState(candidateInfo?.firstName || '');
  const [lastName, setLastName] = useState(candidateInfo?.lastName || '');
  const [email, setEmail] = useState(candidateInfo?.email || '');
  const [phone, setPhone] = useState(candidateInfo?.phone || '');
  const [linkedinUrl, setLinkedinUrl] = useState(candidateInfo?.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(candidateInfo?.githubUrl || '');
  
  // Professional Information
  const [currentEmployer, setCurrentEmployer] = useState(candidateInfo?.currentEmployer || '');
  const [currentRole, setCurrentRole] = useState(candidateInfo?.currentRole || '');
  const [experienceYears, setExperienceYears] = useState(candidateInfo?.experienceYears || 0);
  const [skills, setSkills] = useState<string[]>(candidateInfo?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState<string>(() => {
    const salary: any = candidateInfo?.salaryExpectation;
    if (!salary) return '';
    if (typeof salary === 'number') return String(salary);
    if (typeof salary === 'object' && salary.min !== undefined) {
      return String(salary.min);
    }
    return '';
  });
  
  // Pipeline Information
  const [selectedPositionId, setSelectedPositionId] = useState(pipeline?.positionId || '');
  const [selectedStageId, setSelectedStageId] = useState(pipeline?.stageId || stages[0]?.id || '');
  const [rating, setRating] = useState(pipeline?.rating || 0);
  const [notes, setNotes] = useState(pipeline?.notes || '');
  const [interviewDate, setInterviewDate] = useState(
    pipeline?.interviewDate ? new Date(pipeline.interviewDate).toISOString().split('T')[0] : ''
  );
  const [status, setStatus] = useState<'active' | 'hired' | 'passed' | 'withdrawn'>(
    (pipeline?.status === 'passed' || pipeline?.status === 'active' || pipeline?.status === 'hired' || pipeline?.status === 'withdrawn') 
      ? pipeline.status 
      : 'active'
  );
  
  // Offer Details
  const [offerSalary, setOfferSalary] = useState<string>(
    pipeline?.offerDetails?.salary ? pipeline.offerDetails.salary.toString() : ''
  );
  const [offerStartDate, setOfferStartDate] = useState(
    pipeline?.offerDetails?.startDate ? new Date(pipeline.offerDetails.startDate).toISOString().split('T')[0] : ''
  );
  const [rejectionReason, setRejectionReason] = useState(pipeline?.rejectionReason || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [existingContacts, setExistingContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState(candidateInfo?.id || '');

  // Search for existing contacts when email changes (for new candidates)
  useEffect(() => {
    if (!isEditMode && email.length > 3) {
      searchExistingContacts(email);
    }
  }, [email, isEditMode]);

  const searchExistingContacts = async (searchTerm: string) => {
    setSearchingCandidates(true);
    try {
      const response = await contactsAPI.getAll({ search: searchTerm, limit: 10 });
      setExistingContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setSearchingCandidates(false);
    }
  };

  const selectExistingContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setFirstName(contact.firstName);
    setLastName(contact.lastName);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setCurrentEmployer(contact.currentEmployer || '');
    setCurrentRole(contact.currentRole || '');
    setSkills(contact.skills || []);
    setLinkedinUrl(contact.linkedinUrl || '');
    setGithubUrl(contact.githubUrl || '');
    const salary: any = contact.salaryExpectation;
    if (salary) {
      if (typeof salary === 'number') {
        setSalaryExpectation(String(salary));
      } else if (typeof salary === 'object' && salary.min !== undefined) {
        setSalaryExpectation(String(salary.min));
      } else {
        setSalaryExpectation('');
      }
    } else {
      setSalaryExpectation('');
    }
    setExperienceYears(contact.experienceYears || 0);
    setExistingContacts([]);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !selectedPositionId) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const candidateData = {
        candidateId: selectedContactId,
        firstName,
        lastName,
        email,
        phone,
        linkedinUrl,
        githubUrl,
        currentEmployer,
        currentRole,
        experienceYears,
        skills,
        salaryExpectation: salaryExpectation ? parseInt(salaryExpectation) : undefined
      };

      const pipelineData = {
        positionId: selectedPositionId,
        stageId: selectedStageId,
        rating,
        notes,
        status,
        interviewDate: interviewDate || undefined,
        offerDetails: (offerSalary || offerStartDate) ? {
          salary: offerSalary ? parseInt(offerSalary) : undefined,
          startDate: offerStartDate || undefined
        } : undefined,
        rejectionReason: rejectionReason || undefined
      };

      await onSubmit({
        candidate: candidateData,
        pipeline: pipelineData
      });

      onClose();
    } catch (error: any) {
      console.error('Error submitting candidate:', error);
      toast.error(error.message || 'Failed to save candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none"
          >
            {star <= rating ? (
              <StarIconSolid className="h-6 w-6 text-yellow-500 hover:text-yellow-600" />
            ) : (
              <StarIcon className="h-6 w-6 text-gray-300 hover:text-gray-400" />
            )}
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
        </span>
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-lg max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-primary-dark">
          {isEditMode ? 'Edit Candidate' : 'Add Candidate to Pipeline'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
        {/* Position and Stage Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position *
            </label>
            <select
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Select a position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title} - {position.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Stage
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Existing Contact Search (for new candidates) */}
        {!isEditMode && existingContacts.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Found existing contacts:
            </p>
            <div className="space-y-2">
              {existingContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => selectExistingContact(contact)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {contact.email} • {contact.phone}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <h3 className="text-lg font-semibold text-primary-dark mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Professional Information */}
        <h3 className="text-lg font-semibold text-primary-dark mb-4">Professional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Employer
            </label>
            <input
              type="text"
              value={currentEmployer}
              onChange={(e) => setCurrentEmployer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Role
            </label>
            <input
              type="text"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Expectation
            </label>
            <input
              type="number"
              value={salaryExpectation}
              onChange={(e) => setSalaryExpectation(e.target.value)}
              placeholder="150000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              placeholder="Type a skill and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="ml-2 text-gray-500 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Evaluation */}
        <h3 className="text-lg font-semibold text-primary-dark mb-4">Evaluation</h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            {renderStars()}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interview Date
            </label>
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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
              <option value="active">Active</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Add notes about the candidate..."
            />
          </div>
        </div>

        {/* Offer Details (if status is hired) */}
        {status === 'hired' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary-dark mb-4">Offer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Salary
                </label>
                <input
                  type="number"
                  value={offerSalary}
                  onChange={(e) => setOfferSalary(e.target.value)}
                  placeholder="160000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pass Reason (if status is passed) */}
        {status === 'passed' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pass Reason
            </label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Not a good fit for the role..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Candidate' : 'Add Candidate'}
        </button>
      </div>
    </div>
  );
};

export default CandidateForm;