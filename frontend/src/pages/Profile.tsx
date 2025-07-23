import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { PhotoIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { FormField } from '../components/ui/FormField';

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
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
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
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
    <div className="max-w-7xl mx-auto">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Profile</h3>
            <p className="mt-1 text-sm text-gray-600">
              Your personal information and business details.
            </p>
          </div>
        </div>
        <div className="mt-5 md:col-span-2 md:mt-0">
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
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                      <div className="flex gap-6">
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
                                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
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
                                className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                        Company name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                      />
                    </div>

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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
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
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.firstName} {profile?.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.companyName || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.phone || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.website || 'Not specified'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">
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
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden sm:block" aria-hidden="true">
        <div className="py-5">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      <div className="mt-10 sm:mt-0">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Change Password</h3>
              <p className="mt-1 text-sm text-gray-600">
                Update your password to keep your account secure.
              </p>
            </div>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
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
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                          className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 sm:text-sm"
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
                      className="mr-3 inline-flex justify-center rounded-md border border-gray-300 shadow-sm py-2 px-4 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-800 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
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
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;