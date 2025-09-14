import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { PhotoIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { FormField } from '../components/ui/FormField';
import EmailSignatureEditor from '../components/EmailSignatureEditor';
import StateLicenseManager from '../components/StateLicenseManager';
import { StateLicense } from '../types';

const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    title: profile?.title || '',
    companyName: profile?.companyName || '',
    phone: profile?.phone || '',
    website: profile?.website || '',
    address: {
      street: profile?.address?.street || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      zipCode: profile?.address?.zipCode || '',
    },
    profilePhoto: profile?.profilePhoto || '',
    companyLogo: profile?.companyLogo || '',
    primaryColor: profile?.primaryColor || '#1f2937',
    crmName: profile?.crmName || 'CRM Killer',
    nmlsId: profile?.nmlsId || '',
    stateLicenses: profile?.stateLicenses || [],
  });
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const companyLogoRef = useRef<HTMLInputElement>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profilePhoto' | 'companyLogo') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Image must be less than 5MB' });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [type]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (type: 'profilePhoto' | 'companyLogo') => {
    setFormData(prev => ({
      ...prev,
      [type]: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      const response = await userAPI.updateProfile(formData);
      updateProfile(response.data.profile);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile';

      if (error.response?.status === 413) {
        errorMessage = 'Image too large. Please choose a smaller image (under 5MB).';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      await userAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-mobile sm:px-6 lg:px-8 py-mobile">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your profile information, email signature, and security settings</p>
      </div>
      
      <div className="space-y-8">
        {/* Profile Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary-dark">Profile Information</h2>
          </div>
          {message && (
            <div className={`rounded-md p-4 mb-4 ${
              message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  ) : (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    message.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="shadow sm:overflow-hidden sm:rounded-md">
                <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                  {/* Profile Images */}
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-4">Profile Images</h4>
                    <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
                          <div className="mt-1 flex items-center">
                            {formData.profilePhoto ? (
                              <img
                                src={formData.profilePhoto}
                                alt="Profile"
                                className="h-24 w-24 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                                <PhotoIcon className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            <div className="ml-5">
                              <button
                                type="button"
                                onClick={() => profilePhotoRef.current?.click()}
                                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                Change
                              </button>
                              {formData.profilePhoto && (
                                <button
                                  type="button"
                                  onClick={() => removePhoto('profilePhoto')}
                                  className="ml-3 text-sm text-red-600 hover:text-red-500"
                                >
                                  Remove
                                </button>
                              )}
                              <input
                                ref={profilePhotoRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(e, 'profilePhoto')}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                          <div className="mt-1 flex items-center">
                            {formData.companyLogo ? (
                              <img
                                src={formData.companyLogo}
                                alt="Company Logo"
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
                                <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            <div className="ml-5">
                              <button
                                type="button"
                                onClick={() => companyLogoRef.current?.click()}
                                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                Change
                              </button>
                              {formData.companyLogo && (
                                <button
                                  type="button"
                                  onClick={() => removePhoto('companyLogo')}
                                  className="ml-3 text-sm text-red-600 hover:text-red-500"
                                >
                                  Remove
                                </button>
                              )}
                              <input
                                ref={companyLogoRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(e, 'companyLogo')}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                  
                  {/* Personal Information */}
                  <div className="border-t pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Personal Information</h4>
                    <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Job Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        id="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Sales Manager, CEO"
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                        Company name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        id="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="crmName" className="block text-sm font-medium text-gray-700">
                        CRM Name
                      </label>
                      <input
                        type="text"
                        name="crmName"
                        id="crmName"
                        value={formData.crmName}
                        onChange={handleChange}
                        placeholder="CRM Killer"
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                        Primary Color
                      </label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="color"
                          name="primaryColor"
                          id="primaryColor"
                          value={formData.primaryColor}
                          onChange={handleChange}
                          className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#1f2937"
                          className="ml-3 flex-1 px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                        />
                      </div>
                    </div>

                    </div>
                  </div>
                  
                  {/* Address */}
                  <div className="border-t pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Address</h4>
                    <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                      <label htmlFor="address.street" className="block text-sm font-medium text-gray-700">
                        Street address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        id="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        id="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label htmlFor="address.state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        id="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700">
                        ZIP code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        id="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                      />
                    </div>
                    </div>

                  {/* Loan Officer Fields - Only show if user is a loan officer */}
                  {user?.isLoanOfficer && (
                    <>
                      <div className="pt-6 border-t border-gray-200">
                        <h4 className="text-base font-medium text-gray-900 mb-4">Loan Officer Information</h4>
                        <div className="grid grid-cols-6 gap-6">
                          <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="nmlsId" className="block text-sm font-medium text-gray-700">
                              NMLS ID
                            </label>
                            <input
                              type="text"
                              name="nmlsId"
                              id="nmlsId"
                              value={formData.nmlsId}
                              onChange={handleChange}
                              placeholder="e.g. 123456"
                              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500">Your National Mortgage Licensing System ID</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6">
                        <StateLicenseManager
                          licenses={formData.stateLicenses}
                          onChange={(licenses: StateLicense[]) => setFormData(prev => ({ ...prev, stateLicenses: licenses }))}
                          disabled={false}
                        />
                      </div>
                    </>
                  )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="bg-white px-4 py-5 sm:p-6">
                <div className="flex items-center space-x-6 mb-6">
                  {profile?.profilePhoto ? (
                    <img
                      src={profile.profilePhoto}
                      alt="Profile"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <PhotoIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  {profile?.companyLogo && (
                    <img
                      src={profile.companyLogo}
                      alt="Company Logo"
                      className="h-24 w-24 rounded-lg object-contain"
                    />
                  )}
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.firstName} {profile?.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {user?.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.title || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.companyName || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.phone || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.website || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CRM Name</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.crmName || 'CRM Killer'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Primary Color</dt>
                    <dd className="mt-1 text-sm text-primary-dark flex items-center">
                      <span className="inline-block w-6 h-6 rounded mr-2 border border-gray-300" style={{ backgroundColor: profile?.primaryColor || '#1f2937' }}></span>
                      {profile?.primaryColor || '#1f2937'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-primary-dark">
                      {profile?.address?.street && (
                        <>
                          {profile.address.street}<br />
                          {profile.address.city && `${profile.address.city}, `}
                          {profile.address.state && `${profile.address.state} `}
                          {profile.address.zipCode}
                        </>
                      ) || 'Not specified'}
                    </dd>
                  </div>
                </dl>

                {/* Loan Officer Information Display */}
                {user?.isLoanOfficer && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Loan Officer Information</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">NMLS ID</dt>
                        <dd className="mt-1 text-sm text-primary-dark">
                          {profile?.nmlsId || 'Not specified'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500 mb-2">State Licenses</dt>
                        <dd className="text-sm text-primary-dark">
                          {profile?.stateLicenses && profile.stateLicenses.length > 0 ? (
                            <div className="space-y-1">
                              {profile.stateLicenses.map((license: StateLicense) => (
                                <div key={license.state} className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                    {license.state}
                                  </span>
                                  <span className="text-sm">{license.licenseNumber}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            'No state licenses specified'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="">
          <div className="border-t border-gray-200 pt-8 mb-6">
            <h3 className="text-xl font-semibold text-primary-dark">Security</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your password and account security</p>
          </div>
            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit}>
                <div className="shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 py-5 bg-white sm:p-6">
                    <div className="grid grid-cols-6 gap-6">
                      <div className="col-span-6">
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                          Current password
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          id="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                        />
                      </div>

                      <div className="col-span-6">
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                          New password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          id="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                        />
                      </div>

                      <div className="col-span-6">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                          Confirm new password
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          id="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="mr-3 inline-flex justify-center rounded-md border border-gray-300 shadow-sm py-2 px-4 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="shadow sm:rounded-md sm:overflow-hidden">
                <div className="px-4 py-5 bg-white sm:p-6">
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Email Signature Section */}
        <div className="">
          <div className="border-t border-gray-200 pt-8 mb-6">
            <h3 className="text-xl font-semibold text-primary-dark">Email Signature</h3>
            <p className="text-sm text-gray-600 mt-1">Customize your email signature for all outgoing emails</p>
          </div>
          <div className="shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 bg-white sm:p-6">
              <EmailSignatureEditor profile={profile} user={user} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;