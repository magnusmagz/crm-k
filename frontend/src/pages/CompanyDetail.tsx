import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Company, Contact, Deal } from '../types';
import { companiesAPI, contactsAPI, dealsAPI } from '../services/api';
import { PencilIcon, ArrowLeftIcon, BuildingOfficeIcon, CurrencyDollarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [totalDealValue, setTotalDealValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    license: '',
    linkedinPage: '',
    companyLink1: '',
    companyLink2: '',
    companyLink3: '',
    companyLink4: '',
    companyLink5: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchCompany();
      fetchCompanyContacts();
      fetchCompanyDeals();
    }
  }, [id]);

  const fetchCompany = async () => {
    try {
      const response = await companiesAPI.getById(id!);
      const companyData = response.data.company;
      setCompany(companyData);
      setFormData({
        name: companyData.name || '',
        address: companyData.address || '',
        address2: companyData.address2 || '',
        city: companyData.city || '',
        state: companyData.state || '',
        zip: companyData.zip || '',
        website: companyData.website || '',
        license: companyData.license || '',
        linkedinPage: companyData.linkedinPage || '',
        companyLink1: companyData.companyLink1 || '',
        companyLink2: companyData.companyLink2 || '',
        companyLink3: companyData.companyLink3 || '',
        companyLink4: companyData.companyLink4 || '',
        companyLink5: companyData.companyLink5 || '',
        notes: companyData.notes || '',
      });
    } catch (error) {
      console.error('Failed to fetch company:', error);
      toast.error('Failed to load company');
      navigate('/companies');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyContacts = async () => {
    try {
      const response = await contactsAPI.getAll({ search: '' });
      const allContacts = response.data.contacts;
      // Filter contacts that belong to this company
      const companyContacts = allContacts.filter((contact: Contact) =>
        contact.companyId === id
      );
      setContacts(companyContacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchCompanyDeals = async () => {
    try {
      const response = await dealsAPI.getAll({});
      const allDeals = response.data.deals;
      // Filter deals that belong to this company
      const companyDeals = allDeals.filter((deal: Deal) =>
        deal.companyId === id
      );
      setDeals(companyDeals);

      // Calculate total value of open deals
      const total = companyDeals
        .filter((deal: Deal) => deal.status === 'open')
        .reduce((sum: number, deal: Deal) => sum + (deal.value || 0), 0);
      setTotalDealValue(total);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      const response = await companiesAPI.update(id!, formData);
      setCompany(response.data.company);
      setIsEditing(false);
      toast.success('Company updated successfully');
    } catch (error: any) {
      console.error('Failed to update company:', error);
      toast.error(error.response?.data?.message || 'Failed to update company');
    }
  };

  const handleDelete = async () => {
    if (!company || !window.confirm('Are you sure you want to delete this company? This will not delete associated contacts or deals.')) {
      return;
    }

    try {
      await companiesAPI.delete(company.id);
      toast.success('Company deleted successfully');
      navigate('/companies');
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      toast.error(error.response?.data?.message || 'Failed to delete company');
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

  const handleResearchCompany = () => {
    const name = company?.name || '';
    const city = company?.city || '';
    const state = company?.state || '';
    const website = company?.website || '';
    const linkedinPage = company?.linkedinPage || '';

    let prompt = `Research this company: ${name}`;
    if (city && state) prompt += ` located in ${city}, ${state}`;
    if (website) prompt += ` (website: ${website})`;

    prompt += `. Please provide:\n- Company background and history\n- Products/services offered\n- Market position and competitors\n- Recent news and developments\n- Key leadership and team\n- Company culture and values`;

    if (linkedinPage) prompt += `\n- LinkedIn: ${linkedinPage}`;

    const encodedPrompt = encodeURIComponent(prompt);
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    window.open(chatGPTUrl, '_blank');
  };

  const renderLink = (url: string | undefined, label: string) => {
    if (!url) return null;

    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;

    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-dark underline"
      >
        {displayUrl}
      </a>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  if (isEditing) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-primary-dark">
            Edit Company
          </h3>
        </div>
        <form onSubmit={handleUpdate} className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="space-y-6">
            {/* Company Info Section */}
            <div className="bg-gray-50 px-6 py-5 rounded-lg">
              <h4 className="text-sm font-medium text-primary-dark mb-4">Company Information</h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address2" className="block text-sm font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="address2"
                    name="address2"
                    value={formData.address2}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zip"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-700">
                    License
                  </label>
                  <input
                    type="text"
                    id="license"
                    name="license"
                    value={formData.license}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="bg-gray-50 px-6 py-5 rounded-lg">
              <h4 className="text-sm font-medium text-primary-dark mb-4">Links</h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="linkedinPage" className="block text-sm font-medium text-gray-700">
                    LinkedIn Page
                  </label>
                  <input
                    type="url"
                    id="linkedinPage"
                    name="linkedinPage"
                    value={formData.linkedinPage}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/company/..."
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="companyLink1" className="block text-sm font-medium text-gray-700">
                    Custom Link 1
                  </label>
                  <input
                    type="url"
                    id="companyLink1"
                    name="companyLink1"
                    value={formData.companyLink1}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="companyLink2" className="block text-sm font-medium text-gray-700">
                    Custom Link 2
                  </label>
                  <input
                    type="url"
                    id="companyLink2"
                    name="companyLink2"
                    value={formData.companyLink2}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="companyLink3" className="block text-sm font-medium text-gray-700">
                    Custom Link 3
                  </label>
                  <input
                    type="url"
                    id="companyLink3"
                    name="companyLink3"
                    value={formData.companyLink3}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="companyLink4" className="block text-sm font-medium text-gray-700">
                    Custom Link 4
                  </label>
                  <input
                    type="url"
                    id="companyLink4"
                    name="companyLink4"
                    value={formData.companyLink4}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="companyLink5" className="block text-sm font-medium text-gray-700">
                    Custom Link 5
                  </label>
                  <input
                    type="url"
                    id="companyLink5"
                    name="companyLink5"
                    value={formData.companyLink5}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-gray-50 px-6 py-5 rounded-lg">
              <h4 className="text-sm font-medium text-primary-dark mb-4">Notes</h4>
              <div>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Add any additional notes about this company..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-end gap-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-primary-dark shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
              >
                Update Company
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate('/companies')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to companies
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-primary-dark">
            {company.name}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </button>
            <button
              onClick={handleResearchCompany}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              title="Research this company on ChatGPT"
            >
              <MagnifyingGlassIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Research
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            {/* Company Info Section */}
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <h4 className="text-sm font-semibold text-primary-dark mb-3">Company Information</h4>
            </div>

            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Company Name</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.name}
              </dd>
            </div>

            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.address || 'Not provided'}
                {company.address2 && (
                  <>
                    <br />
                    {company.address2}
                  </>
                )}
              </dd>
            </div>

            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">City</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.city || 'Not provided'}
              </dd>
            </div>

            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">State</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.state || 'Not provided'}
              </dd>
            </div>

            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">ZIP Code</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.zip || 'Not provided'}
              </dd>
            </div>

            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">License</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.license || 'Not provided'}
              </dd>
            </div>

            {/* Links Section */}
            <div className="bg-white px-4 py-5 sm:px-6">
              <h4 className="text-sm font-semibold text-primary-dark mb-3">Links</h4>
            </div>

            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.website ? renderLink(company.website, 'Website') : 'Not provided'}
              </dd>
            </div>

            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {company.linkedinPage ? renderLink(company.linkedinPage, 'LinkedIn') : 'Not provided'}
              </dd>
            </div>

            {company.companyLink1 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Custom Link 1</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                  {renderLink(company.companyLink1, 'Link 1')}
                </dd>
              </div>
            )}

            {company.companyLink2 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Custom Link 2</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                  {renderLink(company.companyLink2, 'Link 2')}
                </dd>
              </div>
            )}

            {company.companyLink3 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Custom Link 3</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                  {renderLink(company.companyLink3, 'Link 3')}
                </dd>
              </div>
            )}

            {company.companyLink4 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Custom Link 4</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                  {renderLink(company.companyLink4, 'Link 4')}
                </dd>
              </div>
            )}

            {company.companyLink5 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Custom Link 5</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                  {renderLink(company.companyLink5, 'Link 5')}
                </dd>
              </div>
            )}

            {/* Notes Section */}
            {company.notes && (
              <>
                <div className="bg-white px-4 py-5 sm:px-6">
                  <h4 className="text-sm font-semibold text-primary-dark mb-3">Notes</h4>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:px-6">
                  <dd className="text-sm text-primary-dark whitespace-pre-wrap">
                    {company.notes}
                  </dd>
                </div>
              </>
            )}

            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {new Date(company.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Related Contacts Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-primary-dark">
            Related Contacts
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} associated with this company
          </p>
        </div>

        <div className="border-t border-gray-200">
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-primary-dark">No contacts</h3>
              <p className="mt-1 text-sm text-gray-500">
                No contacts are currently associated with this company.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <div key={contact.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                        className="text-sm font-medium text-primary hover:text-primary-dark text-left"
                      >
                        {contact.firstName} {contact.lastName}
                      </button>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        {contact.position && <span>{contact.position}</span>}
                        {contact.email && (
                          <>
                            {contact.position && <span className="mx-2">•</span>}
                            <span>{contact.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ArrowLeftIcon className="h-5 w-5 transform rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Deals Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-primary-dark">
              Related Deals
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Total Pipeline Value: <span className="font-semibold text-primary-dark">{formatCurrency(totalDealValue)}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {deals.length === 0 ? (
            <div className="text-center py-12">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-primary-dark">No deals</h3>
              <p className="mt-1 text-sm text-gray-500">
                No deals are currently associated with this company.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {deals.map((deal) => (
                <div key={deal.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-primary-dark truncate">
                          {deal.name}
                        </p>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          deal.status === 'won' ? 'bg-green-100 text-green-800' :
                          deal.status === 'lost' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-primary'
                        }`}>
                          {deal.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>{deal.Stage?.name}</span>
                        <span className="mx-2">•</span>
                        <span>{formatCurrency(deal.value || 0)}</span>
                        {deal.expectedCloseDate && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => navigate(`/pipeline?deal=${deal.id}`)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ArrowLeftIcon className="h-5 w-5 transform rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Company Link */}
      <div className="mt-8 mb-8 text-center">
        <button
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-900 underline"
        >
          Delete Company
        </button>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default CompanyDetail;
