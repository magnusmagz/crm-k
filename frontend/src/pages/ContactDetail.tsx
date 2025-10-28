import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Contact, Deal, Company } from '../types';
import { contactsAPI, dealsAPI, companiesAPI } from '../services/api';
import ContactForm from '../components/ContactForm';
import DealForm from '../components/DealForm';
import EntityDebugView from '../components/automation/EntityDebugView';
import EmailModal from '../components/email/EmailModal';
import EmailHistory from '../components/email/EmailHistory';
import ContactEmailEngagement from '../components/email/ContactEmailEngagement';
import NoteWidget from '../components/notes/NoteWidget';
import ActivityTimeline from '../components/ActivityTimeline';
import { ReminderButton } from '../components/ReminderButton';
import { PencilIcon, TrashIcon, ArrowLeftIcon, PlusIcon, CurrencyDollarIcon, CpuChipIcon, EnvelopeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [totalDealValue, setTotalDealValue] = useState(0);
  const [showDebugView, setShowDebugView] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRefresh, setEmailRefresh] = useState(false);
  const [associatedCompany, setAssociatedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (id) {
      fetchContact();
      fetchContactDeals();
      fetchStages();
    }
  }, [id]);

  const fetchContact = async () => {
    try {
      const response = await contactsAPI.getById(id!);
      const contactData = response.data.contact;
      setContact(contactData);

      // Fetch associated company if companyId exists
      if (contactData.companyId) {
        try {
          const companyResponse = await companiesAPI.getById(contactData.companyId);
          setAssociatedCompany(companyResponse.data.company);
        } catch (error) {
          console.error('Failed to fetch associated company:', error);
        }
      } else {
        setAssociatedCompany(null);
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      navigate('/contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContactDeals = async () => {
    try {
      const response = await dealsAPI.getAll({ contactId: id });
      const contactDeals = response.data.deals;
      setDeals(contactDeals);
      
      // Calculate total value of open deals
      const total = contactDeals
        .filter((deal: Deal) => deal.status === 'open')
        .reduce((sum: number, deal: Deal) => sum + (deal.value || 0), 0);
      setTotalDealValue(total);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await import('../services/api').then(m => m.stagesAPI.getAll());
      setStages(response.data.stages);
    } catch (error) {
      console.error('Failed to fetch stages:', error);
    }
  };

  const handleUpdate = (updatedContact: Contact) => {
    setContact(updatedContact);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!contact || !window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await contactsAPI.delete(contact.id);
      navigate('/contacts');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleDealCreate = async (dealData: any) => {
    try {
      await dealsAPI.create({ ...dealData, contactId: contact?.id });
      toast.success('Deal created successfully');
      setShowDealForm(false);
      fetchContactDeals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create deal');
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

  const handleResearchContact = () => {
    // Build ChatGPT research prompt with contact details
    const firstName = contact?.firstName || '';
    const lastName = contact?.lastName || '';
    const company = contact?.company || '';
    const position = contact?.position || '';

    // Create a detailed research prompt
    let prompt = `Research this person: ${firstName} ${lastName}`;

    if (company) {
      prompt += ` from ${company}`;
    }

    if (position) {
      prompt += ` (${position})`;
    }

    prompt += `. Please provide:\n- Professional background and experience\n- Current role and responsibilities\n- Company information\n- Recent news or activities\n- Social media presence (LinkedIn, Twitter, etc.)\n- Any relevant articles or publications`;

    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);

    // Open ChatGPT with the pre-filled prompt
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    window.open(chatGPTUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contact) {
    return <div>Contact not found</div>;
  }

  if (isEditing) {
    return (
      <ContactForm
        contact={contact}
        onSubmit={handleUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to contacts
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-primary-dark">
            {contact.firstName} {contact.lastName}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
            {contact.email && (
              <button
                onClick={() => setShowEmailModal(true)}
                disabled={contact.isUnsubscribed}
                className={`inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  contact.isUnsubscribed
                    ? 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary'
                }`}
                title={contact.isUnsubscribed ? 'Cannot send email - contact is unsubscribed' : 'Send email'}
              >
                <EnvelopeIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                {contact.isUnsubscribed ? 'Unsubscribed' : 'Email'}
              </button>
            )}
            <button
              onClick={handleResearchContact}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              title="Research this contact on ChatGPT"
            >
              <MagnifyingGlassIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Research
            </button>
            <ReminderButton
              entityType="contact"
              entityId={contact.id}
              entityName={`${contact.firstName} ${contact.lastName}`}
              variant="button"
              size="md"
            />
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {contact.firstName} {contact.lastName}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {contact.email ? (
                  <div className="flex items-center gap-3">
                    <span className={contact.isUnsubscribed ? 'line-through text-gray-400' : ''}>
                      {contact.email}
                    </span>
                    {contact.isUnsubscribed && (
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                        title={`Unsubscribed: ${contact.unsubscribeReason || 'Unknown reason'}`}
                      >
                        Unsubscribed
                      </span>
                    )}
                  </div>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Phone number</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {contact.phone || 'Not provided'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                <div className="flex items-center gap-2">
                  {associatedCompany ? (
                    <>
                      <button
                        onClick={() => navigate(`/companies/${associatedCompany.id}`)}
                        className="text-primary hover:text-primary-dark underline font-medium"
                      >
                        {associatedCompany.name}
                      </button>
                      <span className="text-xs text-gray-500">(Associated Company)</span>
                    </>
                  ) : contact.company ? (
                    <span>{contact.company}</span>
                  ) : (
                    <span className="text-gray-500">Not provided</span>
                  )}
                </div>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Position</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {contact.position || 'Not provided'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Tags</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  'No tags'
                )}
              </dd>
            </div>
            {contact.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                  {contact.notes}
                </dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-primary-dark sm:mt-0 sm:col-span-2">
                {new Date(contact.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mt-8">
        <NoteWidget contactId={contact.id} />
      </div>

      {/* Activity Timeline */}
      <div className="mt-8">
        <ActivityTimeline
          contactId={contact.id}
          onRefresh={() => {
            fetchContact();
            fetchContactDeals();
            setEmailRefresh(!emailRefresh);
          }}
        />
      </div>

      {/* Deals Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-primary-dark">
              Deals
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Total Pipeline Value: <span className="font-semibold text-primary-dark">{formatCurrency(totalDealValue)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowDealForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Deal
          </button>
        </div>
        
        <div className="border-t border-gray-200">
          {deals.length === 0 ? (
            <div className="text-center py-12">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-primary-dark">No deals</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a deal to start tracking opportunities with this contact.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowDealForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Deal
                </button>
              </div>
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

      {/* Email Engagement Analytics */}
      {contact.email && (
        <div className="mt-8">
          <ContactEmailEngagement contactId={contact.id} />
        </div>
      )}

      {/* Email History Section */}
      {contact.email && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-primary-dark">
              Email History
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              View all emails sent to this contact
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <EmailHistory contactId={contact.id} refresh={emailRefresh} />
          </div>
        </div>
      )}

      {/* Automation Debug Section */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center cursor-pointer" onClick={() => setShowDebugView(!showDebugView)}>
          <div className="flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-gray-500" />
            <h3 className="text-lg leading-6 font-medium text-primary-dark">
              Automation Debug Info
            </h3>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className={`h-5 w-5 transform transition-transform ${showDebugView ? '-rotate-90' : 'rotate-180'}`} />
          </button>
        </div>
        {showDebugView && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <EntityDebugView entityType="contact" entityId={id!} />
          </div>
        )}
      </div>

      {/* Deal Form Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <DealForm
              stages={stages}
              onSubmit={handleDealCreate}
              onClose={() => setShowDealForm(false)}
              defaultContactId={contact?.id}
            />
          </div>
        </div>
      )}

      {/* Email Modal */}
      {contact && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          contact={contact}
          onSuccess={() => {
            setShowEmailModal(false);
            setEmailRefresh(!emailRefresh);
          }}
        />
      )}

      {/* Delete Contact Link */}
      <div className="mt-8 mb-8 text-center">
        <button
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-900 underline"
        >
          Delete Contact
        </button>
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default ContactDetail;