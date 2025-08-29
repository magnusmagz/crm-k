import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  UserIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

interface CreateOrganizationForm {
  // Organization details
  name: string;
  crmName: string;
  primaryColor: string;
  
  // Admin user details
  adminEmail: string;
  adminName: string;
  
  // Contact information
  contactEmail: string;
  website: string;
  phone: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const CreateOrganization: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CreateOrganizationForm>({
    name: '',
    crmName: '',
    primaryColor: '#6366f1',
    adminEmail: '',
    adminName: '',
    contactEmail: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [errors, setErrors] = useState<Partial<CreateOrganizationForm>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CreateOrganizationForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Auto-generate CRM name from organization name
    if (name === 'name' && !formData.crmName) {
      setFormData(prev => ({ ...prev, crmName: value }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<CreateOrganizationForm> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Organization name is required';
      }
      if (!formData.crmName.trim()) {
        newErrors.crmName = 'CRM name is required';
      }
      if (!formData.primaryColor.match(/^#[0-9A-F]{6}$/i)) {
        newErrors.primaryColor = 'Valid hex color is required';
      }
    } else if (step === 2) {
      if (!formData.adminEmail.trim()) {
        newErrors.adminEmail = 'Admin email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
        newErrors.adminEmail = 'Valid email address is required';
      }
      if (!formData.adminName.trim()) {
        newErrors.adminName = 'Admin name is required';
      }
    }
    // Step 3 (contact info) and Step 4 (address) are optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!validateStep(1) || !validateStep(2)) {
      setCurrentStep(1);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        name: formData.name.trim(),
        crmName: formData.crmName.trim(),
        primaryColor: formData.primaryColor,
        adminEmail: formData.adminEmail.trim(),
        adminName: formData.adminName.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        website: formData.website.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined
      };

      const response = await api.post('/super-admin/organizations', payload);
      
      // Success - redirect to organization details
      navigate(`/super-admin/organizations/${response.data.organization.id}`, {
        state: { message: 'Organization created successfully!' }
      });

    } catch (error: any) {
      console.error('Failed to create organization:', error);
      setError(error.response?.data?.error || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Organization Details', icon: BuildingOfficeIcon },
    { id: 2, name: 'Admin User', icon: UserIcon },
    { id: 3, name: 'Contact Information', icon: EnvelopeIcon },
    { id: 4, name: 'Review & Create', icon: BuildingOfficeIcon },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/super-admin/organizations')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Organizations
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Organization</h1>
        <p className="mt-1 text-sm text-gray-600">
          Set up a new organization with admin user and branding
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} flex-1`}>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== steps.length - 1 && (
                    <div className={`h-0.5 w-full ${currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div
                  className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                    currentStep === step.id
                      ? 'bg-indigo-600 text-white'
                      : currentStep > step.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={`absolute top-10 left-1/2 transform -translate-x-1/2 text-xs font-medium ${
                  currentStep >= step.id ? 'text-indigo-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Organization Details
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.name
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., Acme Real Estate"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="crmName" className="block text-sm font-medium text-gray-700">
                    CRM Display Name *
                  </label>
                  <input
                    type="text"
                    name="crmName"
                    id="crmName"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.crmName
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., Acme CRM"
                    value={formData.crmName}
                    onChange={handleInputChange}
                  />
                  <p className="mt-1 text-sm text-gray-500">This appears in the application header</p>
                  {errors.crmName && <p className="mt-1 text-sm text-red-600">{errors.crmName}</p>}
                </div>

                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                    Primary Brand Color *
                  </label>
                  <div className="mt-1 flex items-center space-x-3">
                    <input
                      type="color"
                      name="primaryColor"
                      id="primaryColor"
                      className="h-10 w-20 rounded-md border border-gray-300 cursor-pointer"
                      value={formData.primaryColor}
                      onChange={handleInputChange}
                    />
                    <input
                      type="text"
                      className={`block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.primaryColor
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    />
                  </div>
                  {errors.primaryColor && <p className="mt-1 text-sm text-red-600">{errors.primaryColor}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Admin User */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Organization Administrator
                </h3>
                <p className="text-sm text-gray-600">
                  This user will be the first admin for the organization and will receive login credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                    Admin Email Address *
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    id="adminEmail"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.adminEmail
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="admin@example.com"
                    value={formData.adminEmail}
                    onChange={handleInputChange}
                  />
                  {errors.adminEmail && <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    id="adminName"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.adminName
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="John Smith"
                    value={formData.adminName}
                    onChange={handleInputChange}
                  />
                  {errors.adminName && <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
                <p className="text-sm text-gray-600">
                  Optional contact details for the organization (can be updated later).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                    General Contact Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    id="contactEmail"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="info@example.com"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    id="website"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="New York"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    maxLength={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="NY"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    id="zipCode"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="10001"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Review & Create Organization
                </h3>
                <p className="text-sm text-gray-600">
                  Please review the information below before creating the organization.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Organization Details</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Name:</span> {formData.name}</div>
                    <div><span className="font-medium">CRM Name:</span> {formData.crmName}</div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Brand Color:</span> 
                      <div 
                        className="w-4 h-4 rounded border mr-2" 
                        style={{ backgroundColor: formData.primaryColor }}
                      />
                      {formData.primaryColor}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Administrator</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Email:</span> {formData.adminEmail}</div>
                    <div><span className="font-medium">Name:</span> {formData.adminName}</div>
                  </div>
                </div>

                {(formData.contactEmail || formData.website || formData.phone || formData.address) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <div className="text-sm space-y-1">
                      {formData.contactEmail && <div><span className="font-medium">Email:</span> {formData.contactEmail}</div>}
                      {formData.website && <div><span className="font-medium">Website:</span> {formData.website}</div>}
                      {formData.phone && <div><span className="font-medium">Phone:</span> {formData.phone}</div>}
                      {formData.address && (
                        <div>
                          <span className="font-medium">Address:</span> {formData.address}
                          {formData.city && `, ${formData.city}`}
                          {formData.state && `, ${formData.state}`}
                          {formData.zipCode && ` ${formData.zipCode}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>
            )}
          </div>

          <div>
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateOrganization;