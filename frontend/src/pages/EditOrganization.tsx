import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface EditOrganizationForm {
  name: string;
  crmName: string;
  primaryColor: string;
  isActive: boolean;
  contactEmail: string;
  website: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const EditOrganization: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<EditOrganizationForm>({
    name: '',
    crmName: '',
    primaryColor: '#6366f1',
    isActive: true,
    contactEmail: '',
    website: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [errors, setErrors] = useState<Partial<EditOrganizationForm>>({});

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/super-admin/organizations/${id}`);
      const org = response.data.organization;

      setFormData({
        name: org.name || '',
        crmName: org.crm_name || '',
        primaryColor: org.primary_color || '#6366f1',
        isActive: org.is_active !== undefined ? org.is_active : true,
        contactEmail: org.contact_email || '',
        website: org.website || '',
        contactPhone: org.contact_phone || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        zipCode: org.zip_code || ''
      });
    } catch (error: any) {
      console.error('Failed to fetch organization:', error);
      setError(error.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof EditOrganizationForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EditOrganizationForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }
    if (!formData.crmName.trim()) {
      newErrors.crmName = 'CRM name is required';
    }
    if (!formData.primaryColor.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.primaryColor = 'Valid hex color is required';
    }
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Valid email address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const payload = {
        name: formData.name.trim(),
        crmName: formData.crmName.trim(),
        primaryColor: formData.primaryColor,
        isActive: formData.isActive,
        contactEmail: formData.contactEmail.trim() || undefined,
        website: formData.website.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined
      };

      await api.put(`/super-admin/organizations/${id}`, payload);

      setSuccessMessage('Organization updated successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/super-admin/organizations/${id}`);
      }, 1500);

    } catch (error: any) {
      console.error('Failed to update organization:', error);
      setError(error.response?.data?.error || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/super-admin/organizations/${id}`)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Organization
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Organization</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update organization details and settings
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700">{successMessage}</div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-8 space-y-6">
          {/* Organization Details */}
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
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-primary'
                }`}
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
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-primary'
                }`}
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
                      : 'border-gray-300 focus:ring-indigo-500 focus:border-primary'
                  }`}
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                />
              </div>
              {errors.primaryColor && <p className="mt-1 text-sm text-red-600">{errors.primaryColor}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="isActive" className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Organization is active
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">Inactive organizations cannot be accessed by users</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Contact Information
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Optional contact details for the organization
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                id="contactEmail"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.contactEmail
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-primary'
                }`}
                value={formData.contactEmail}
                onChange={handleInputChange}
              />
              {errors.contactEmail && <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>}
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                name="website"
                id="website"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
                value={formData.website}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="contactPhone"
                id="contactPhone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
                value={formData.contactPhone}
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-primary sm:text-sm"
                value={formData.zipCode}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between">
          <button
            type="button"
            onClick={() => navigate(`/super-admin/organizations/${id}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditOrganization;
