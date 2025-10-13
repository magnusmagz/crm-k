import React, { useState } from 'react';
import { Company } from '../types';
import { companiesAPI } from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FormField, FormTextarea } from './ui/FormField';
import toast from 'react-hot-toast';

interface CompanyFormProps {
  company?: Company;
  onSubmit: (company: Company) => void;
  onCancel: () => void;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    address: company?.address || '',
    address2: company?.address2 || '',
    city: company?.city || '',
    state: company?.state || '',
    zip: company?.zip || '',
    website: company?.website || '',
    license: company?.license || '',
    linkedinPage: company?.linkedinPage || '',
    companyLink1: company?.companyLink1 || '',
    companyLink2: company?.companyLink2 || '',
    companyLink3: company?.companyLink3 || '',
    companyLink4: company?.companyLink4 || '',
    companyLink5: company?.companyLink5 || '',
    notes: company?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty URLs are valid (optional)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    // Validate URL fields
    if (formData.website && !validateUrl(formData.website)) {
      newErrors.website = 'Invalid website URL';
    }
    if (formData.linkedinPage && !validateUrl(formData.linkedinPage)) {
      newErrors.linkedinPage = 'Invalid LinkedIn URL';
    }
    if (formData.companyLink1 && !validateUrl(formData.companyLink1)) {
      newErrors.companyLink1 = 'Invalid URL';
    }
    if (formData.companyLink2 && !validateUrl(formData.companyLink2)) {
      newErrors.companyLink2 = 'Invalid URL';
    }
    if (formData.companyLink3 && !validateUrl(formData.companyLink3)) {
      newErrors.companyLink3 = 'Invalid URL';
    }
    if (formData.companyLink4 && !validateUrl(formData.companyLink4)) {
      newErrors.companyLink4 = 'Invalid URL';
    }
    if (formData.companyLink5 && !validateUrl(formData.companyLink5)) {
      newErrors.companyLink5 = 'Invalid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const data = {
        ...formData,
      };

      let result;
      if (company) {
        const response = await companiesAPI.update(company.id, data);
        result = response.data.company;
        toast.success('Company updated successfully');
      } else {
        const response = await companiesAPI.create(data);
        result = response.data.company;
        toast.success('Company created successfully');
      }

      onSubmit(result);
    } catch (error: any) {
      console.error('Failed to save company:', error);

      let errorMessage = 'Failed to save company';

      if (error.response?.data?.errors) {
        // Express validator errors
        errorMessage = error.response.data.errors.map((err: any) => err.msg).join(', ');
      } else if (error.response?.data?.error) {
        // Custom error message
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold leading-6 text-primary-dark">
            {company ? 'Edit Company' : 'New Company'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  label="Company Name"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />
              </div>

              <FormField
                label="License"
                id="license"
                name="license"
                value={formData.license}
                onChange={handleChange}
              />

              <FormField
                label="Website"
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                error={errors.website}
                placeholder="https://example.com"
              />

              <div className="sm:col-span-2">
                <FormField
                  label="LinkedIn Page"
                  id="linkedinPage"
                  name="linkedinPage"
                  type="url"
                  value={formData.linkedinPage}
                  onChange={handleChange}
                  error={errors.linkedinPage}
                  placeholder="https://linkedin.com/company/example"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Address Information</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  label="Address"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="Address Line 2"
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                />
              </div>

              <FormField
                label="City"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />

              <FormField
                label="State"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />

              <FormField
                label="ZIP Code"
                id="zip"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Additional Links */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Additional Links</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <FormField
                label="Company Link 1"
                id="companyLink1"
                name="companyLink1"
                type="url"
                value={formData.companyLink1}
                onChange={handleChange}
                error={errors.companyLink1}
                placeholder="https://"
              />

              <FormField
                label="Company Link 2"
                id="companyLink2"
                name="companyLink2"
                type="url"
                value={formData.companyLink2}
                onChange={handleChange}
                error={errors.companyLink2}
                placeholder="https://"
              />

              <FormField
                label="Company Link 3"
                id="companyLink3"
                name="companyLink3"
                type="url"
                value={formData.companyLink3}
                onChange={handleChange}
                error={errors.companyLink3}
                placeholder="https://"
              />

              <FormField
                label="Company Link 4"
                id="companyLink4"
                name="companyLink4"
                type="url"
                value={formData.companyLink4}
                onChange={handleChange}
                error={errors.companyLink4}
                placeholder="https://"
              />

              <FormField
                label="Company Link 5"
                id="companyLink5"
                name="companyLink5"
                type="url"
                value={formData.companyLink5}
                onChange={handleChange}
                error={errors.companyLink5}
                placeholder="https://"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 px-6 py-5 rounded-lg">
            <h4 className="text-sm font-medium text-primary-dark mb-4">Additional Information</h4>
            <div className="space-y-6">
              <FormTextarea
                label="Notes"
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-end gap-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-primary-dark shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : company ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
