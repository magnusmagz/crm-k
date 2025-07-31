import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { userAPI } from '../services/api';

interface EmailSignature {
  enabled: boolean;
  layout: 'modern' | 'classic' | 'minimal';
  includePhoto: boolean;
  includeLogo: boolean;
  includeSocial: boolean;
  photoUrl: string | null;
  logoUrl: string | null;
  fields: {
    name: { show: boolean; value: string };
    title: { show: boolean; value: string };
    email: { show: boolean; value: string };
    phone: { show: boolean; value: string };
    company: { show: boolean; value: string };
    address: { show: boolean; value: string };
  };
  social: {
    linkedin: { show: boolean; url: string };
    twitter: { show: boolean; url: string };
    facebook: { show: boolean; url: string };
    instagram: { show: boolean; url: string };
    website: { show: boolean; url: string };
  };
  style: {
    primaryColor: string;
    fontFamily: string;
    fontSize: string;
    spacing: 'compact' | 'normal' | 'relaxed';
    dividerStyle: 'none' | 'line' | 'dots';
  };
  customHtml: string | null;
}

interface Props {
  profile: any;
  onSave?: () => void;
}

const EmailSignatureEditor: React.FC<Props> = ({ profile, onSave }) => {
  const [signature, setSignature] = useState<EmailSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Remove photo/logo input refs since we'll use profile images

  useEffect(() => {
    fetchSignature();
  }, []);

  useEffect(() => {
    if (signature) {
      generatePreview();
    }
  }, [signature]);

  const fetchSignature = async () => {
    try {
      const response = await userAPI.getEmailSignature();
      setSignature(response.data.emailSignature);
      setLoading(false);
    } catch (err) {
      setError('Failed to load email signature');
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      const response = await userAPI.generateEmailSignature();
      setPreviewHtml(response.data.html);
    } catch (err) {
      console.error('Failed to generate preview:', err);
    }
  };

  const handleSave = async () => {
    if (!signature) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await userAPI.updateEmailSignature(signature);
      setSuccess('Email signature saved successfully!');
      if (onSave) onSave();
      
      // Generate new preview after save
      generatePreview();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save email signature');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, subfield: 'show' | 'value', value: any) => {
    if (!signature) return;
    
    setSignature({
      ...signature,
      fields: {
        ...signature.fields,
        [field]: {
          ...signature.fields[field as keyof typeof signature.fields],
          [subfield]: value
        }
      }
    });
  };

  const handleSocialChange = (platform: string, subfield: 'show' | 'url', value: any) => {
    if (!signature) return;
    
    setSignature({
      ...signature,
      social: {
        ...signature.social,
        [platform]: {
          ...signature.social[platform as keyof typeof signature.social],
          [subfield]: value
        }
      }
    });
  };

  const handleStyleChange = (property: string, value: any) => {
    if (!signature) return;
    
    setSignature({
      ...signature,
      style: {
        ...signature.style,
        [property]: value
      }
    });
  };

  // Update signature to use profile images when toggled on
  const updateSignatureImages = (includePhoto: boolean, includeLogo: boolean) => {
    if (!signature) return;
    
    setSignature({
      ...signature,
      includePhoto,
      includeLogo,
      photoUrl: includePhoto && profile?.profilePhoto ? profile.profilePhoto : null,
      logoUrl: includeLogo && profile?.companyLogo ? profile.companyLogo : null
    });
  };

  if (loading) {
    return <div className="animate-pulse">Loading email signature settings...</div>;
  }

  if (!signature) {
    return <div>No signature data available</div>;
  }

  // Fill in default values from profile
  const defaultValues = {
    name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
    email: profile?.email || '',
    phone: profile?.phone || '',
    company: profile?.companyName || '',
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Email Signature</h3>
          <p className="text-sm text-gray-500">Automatically append your signature to all emails</p>
        </div>
        <Switch
          checked={signature.enabled}
          onChange={(enabled) => setSignature({ ...signature, enabled })}
          className={`${
            signature.enabled ? 'bg-primary' : 'bg-gray-200'
          } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
        >
          <span
            className={`${
              signature.enabled ? 'translate-x-5' : 'translate-x-0.5'
            } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>

      {signature.enabled && (
        <>
          {/* Layout Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Layout Style</label>
            <div className="grid grid-cols-3 gap-4">
              {['modern', 'classic', 'minimal'].map((layout) => (
                <button
                  key={layout}
                  onClick={() => setSignature({ ...signature, layout: layout as any })}
                  className={`p-4 border rounded-lg text-center capitalize ${
                    signature.layout === layout
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Settings */}
            <div className="space-y-6">
              {/* Images */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Images</h4>
                <p className="text-xs text-gray-500">Images are managed in your profile settings above</p>
                
                {/* Profile Photo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={signature.includePhoto}
                      onChange={(checked) => updateSignatureImages(checked, signature.includeLogo)}
                      className={`${
                        signature.includePhoto ? 'bg-primary' : 'bg-gray-200'
                      } relative inline-flex h-5 w-9 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          signature.includePhoto ? 'translate-x-5' : 'translate-x-0.5'
                        } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                    <span className="text-sm text-gray-700">Profile Photo</span>
                  </div>
                  {signature.includePhoto && (
                    <div className="flex items-center space-x-2">
                      {profile?.profilePhoto ? (
                        <img src={profile.profilePhoto} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">No profile photo uploaded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Logo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={signature.includeLogo}
                      onChange={(checked) => updateSignatureImages(signature.includePhoto, checked)}
                      className={`${
                        signature.includeLogo ? 'bg-primary' : 'bg-gray-200'
                      } relative inline-flex h-5 w-9 items-center rounded-full`}
                    >
                      <span
                        className={`${
                          signature.includeLogo ? 'translate-x-5' : 'translate-x-0.5'
                        } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                    <span className="text-sm text-gray-700">Company Logo</span>
                  </div>
                  {signature.includeLogo && (
                    <div className="flex items-center space-x-2">
                      {profile?.companyLogo ? (
                        <img src={profile.companyLogo} alt="Logo" className="h-10 max-w-[100px] object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500">No company logo uploaded</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                
                {Object.entries(signature.fields).map(([field, data]) => (
                  <div key={field} className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={data.show}
                        onChange={(checked) => handleFieldChange(field, 'show', checked)}
                        className={`${
                          data.show ? 'bg-primary' : 'bg-gray-200'
                        } relative inline-flex h-5 w-9 items-center rounded-full`}
                      >
                        <span
                          className={`${
                            data.show ? 'translate-x-5' : 'translate-x-0.5'
                          } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                      <span className="text-sm text-gray-700 capitalize">{field}</span>
                    </div>
                    {data.show && (
                      <input
                        type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                        value={data.value}
                        onChange={(e) => handleFieldChange(field, 'value', e.target.value)}
                        placeholder={defaultValues[field as keyof typeof defaultValues] || `Enter ${field}`}
                        className="ml-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Social Links</h4>
                  <Switch
                    checked={signature.includeSocial}
                    onChange={(checked) => setSignature({ ...signature, includeSocial: checked })}
                    className={`${
                      signature.includeSocial ? 'bg-primary' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span
                      className={`${
                        signature.includeSocial ? 'translate-x-5' : 'translate-x-0.5'
                      } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
                
                {signature.includeSocial && Object.entries(signature.social).map(([platform, data]) => (
                  <div key={platform} className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={data.show}
                        onChange={(checked) => handleSocialChange(platform, 'show', checked)}
                        className={`${
                          data.show ? 'bg-primary' : 'bg-gray-200'
                        } relative inline-flex h-5 w-9 items-center rounded-full`}
                      >
                        <span
                          className={`${
                            data.show ? 'translate-x-5' : 'translate-x-0.5'
                          } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                      <span className="text-sm text-gray-700 capitalize">{platform}</span>
                    </div>
                    {data.show && (
                      <input
                        type="url"
                        value={data.url}
                        onChange={(e) => handleSocialChange(platform, 'url', e.target.value)}
                        placeholder={`https://${platform}.com/yourprofile`}
                        className="ml-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Style Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Style Settings</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={signature.style.primaryColor}
                      onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={signature.style.primaryColor}
                      onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                  <select
                    value={signature.style.fontFamily}
                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                  <select
                    value={signature.style.fontSize}
                    onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="12px">Small (12px)</option>
                    <option value="14px">Medium (14px)</option>
                    <option value="16px">Large (16px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spacing</label>
                  <select
                    value={signature.style.spacing}
                    onChange={(e) => handleStyleChange('spacing', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <div className="sticky top-4">
                <h4 className="font-medium text-gray-900 mb-4">Preview</h4>
                <div className="border rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-4 text-sm text-gray-600">
                    <p>This is how your signature will appear in emails:</p>
                  </div>
                  <div className="border-t pt-4">
                    {previewHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                      <div className="text-gray-400 text-center py-8">
                        Enable signature and add content to see preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Signature'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailSignatureEditor;