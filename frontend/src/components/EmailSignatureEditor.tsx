import React, { useState, useEffect } from 'react';
import { Checkbox } from './ui/Checkbox';
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
  fieldOrder?: string[];
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
  user?: any;
  onSave?: () => void;
}

const EmailSignatureEditor: React.FC<Props> = ({ profile, user, onSave }) => {
  const [signature, setSignature] = useState<EmailSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  
  // Default values from profile
  const defaultValues = {
    name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
    email: user?.email || '',
    phone: profile?.phone || '',
    company: profile?.companyName || '',
  };

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
      const sig = response.data.emailSignature;
      
      // Ensure fieldOrder exists
      if (!sig.fieldOrder) {
        sig.fieldOrder = ['name', 'title', 'email', 'phone', 'company', 'address'];
      }
      
      setSignature(sig);
      setLoading(false);
    } catch (err) {
      setError('Failed to load email signature');
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!signature || !signature.enabled) {
      setPreviewHtml('');
      return;
    }
    
    // Generate preview locally for immediate feedback
    const html = generateLocalPreview(signature);
    setPreviewHtml(html);
  };
  
  const handleDragStart = (e: React.DragEvent, field: string) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault();
    
    if (!signature || !draggedField || draggedField === targetField) return;
    
    const fieldOrder = [...(signature.fieldOrder || [])];
    const draggedIndex = fieldOrder.indexOf(draggedField);
    const targetIndex = fieldOrder.indexOf(targetField);
    
    // Remove dragged field and insert at target position
    fieldOrder.splice(draggedIndex, 1);
    fieldOrder.splice(targetIndex, 0, draggedField);
    
    setSignature({
      ...signature,
      fieldOrder
    });
    
    setDraggedField(null);
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: 'Name',
      title: 'Title',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      address: 'Address'
    };
    return labels[field] || field;
  };

  const generateLocalPreview = (sig: EmailSignature) => {
    const { fields, style, social, layout } = sig;
    const { primaryColor, fontFamily, fontSize } = style;

    // Fill in default values from profile
    const name = fields.name.value || defaultValues.name;
    const email = fields.email.value || defaultValues.email;
    const phone = fields.phone.value || defaultValues.phone;
    const company = fields.company.value || defaultValues.company;

    let html = `<div style="font-family: ${fontFamily}; font-size: ${fontSize}; color: #333; line-height: 1.5;">`;
    
    if (layout === 'modern') {
      html += `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${fontFamily};">`;
      html += '<tr>';
      
      // Photo column if enabled
      if (sig.includePhoto && profile?.profilePhoto) {
        html += `<td style="padding-right: 15px; vertical-align: top;">`;
        html += `<img src="${profile.profilePhoto}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-cover;">`;
        html += '</td>';
      }
      
      // Info column
      html += '<td style="vertical-align: top;">';
      
      // Render fields in the specified order
      const fieldOrder = sig.fieldOrder || ['name', 'title', 'email', 'phone', 'company', 'address'];
      const fieldValues: Record<string, string> = {
        name,
        title: fields.title.value,
        email,
        phone,
        company,
        address: fields.address.value
      };
      
      // Render top section fields (name, title, email, phone)
      const topFields = fieldOrder.filter(f => ['name', 'title', 'email', 'phone'].includes(f));
      topFields.forEach((fieldName, index) => {
        const field = fields[fieldName as keyof typeof fields];
        const value = fieldValues[fieldName];
        
        if (field.show && value) {
          if (fieldName === 'name') {
            html += `<div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 5px;">${value}</div>`;
          } else if (fieldName === 'title') {
            html += `<div style="color: #666; margin-bottom: 10px;">${value}</div>`;
          } else if (fieldName === 'email') {
            html += `<div style="margin-bottom: 3px;"><a href="mailto:${value}" style="color: ${primaryColor}; text-decoration: none;">${value}</a></div>`;
          } else if (fieldName === 'phone') {
            html += `<div style="margin-bottom: 10px;"><a href="tel:${value}" style="color: #333; text-decoration: none;">${value}</a></div>`;
          }
        }
      });
      
      // Company info with logo
      const bottomFields = fieldOrder.filter(f => ['company', 'address'].includes(f));
      if (sig.includeLogo || bottomFields.some(f => fields[f as keyof typeof fields].show && fieldValues[f])) {
        html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e5e5;">';
        
        if (sig.includeLogo && profile?.companyLogo) {
          html += `<img src="${profile.companyLogo}" alt="Company Logo" style="max-height: 40px; margin-bottom: 5px;">`;
        }
        
        bottomFields.forEach(fieldName => {
          const field = fields[fieldName as keyof typeof fields];
          const value = fieldValues[fieldName];
          
          if (field.show && value) {
            if (fieldName === 'company') {
              html += `<div style="font-weight: bold; margin-bottom: 3px;">${value}</div>`;
            } else if (fieldName === 'address') {
              html += `<div style="color: #666; font-size: 0.9em;">${value}</div>`;
            }
          }
        });
        
        html += '</div>';
      }
      
      // Social links
      if (sig.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 10px;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' | ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
      
      html += '</td>';
      html += '</tr>';
      html += '</table>';
    } else if (layout === 'classic') {
      // Classic layout - vertical stacked format
      if (fields.name.show && name) {
        html += `<div style="font-weight: bold; font-size: 1.1em; margin-bottom: 2px;">${name}</div>`;
      }
      if (fields.title.show && fields.title.value) {
        html += `<div style="color: #666; margin-bottom: 8px;">${fields.title.value}</div>`;
      }
      
      if (fields.company.show && company) {
        html += `<div style="font-weight: bold; margin-bottom: 8px;">${company}</div>`;
      }
      
      // Contact details
      if (fields.email.show && email) {
        html += `<div style="margin-bottom: 2px;">Email: <a href="mailto:${email}" style="color: ${primaryColor}; text-decoration: none;">${email}</a></div>`;
      }
      if (fields.phone.show && phone) {
        html += `<div style="margin-bottom: 2px;">Phone: <a href="tel:${phone}" style="color: #333; text-decoration: none;">${phone}</a></div>`;
      }
      if (fields.address.show && fields.address.value) {
        html += `<div style="margin-bottom: 8px;">Address: ${fields.address.value}</div>`;
      }
      
      // Logo at bottom
      if (sig.includeLogo && profile?.companyLogo) {
        html += `<div style="margin-top: 12px;"><img src="${profile.companyLogo}" alt="Company Logo" style="max-height: 50px;"></div>`;
      }
      
      // Social links
      if (sig.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 12px;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' | ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
    } else if (layout === 'minimal') {
      // Minimal layout - compact single line format
      let parts = [];
      
      if (fields.name.show && name) {
        parts.push(`<span style="font-weight: bold;">${name}</span>`);
      }
      if (fields.title.show && fields.title.value) {
        parts.push(fields.title.value);
      }
      if (fields.company.show && company) {
        parts.push(company);
      }
      
      if (parts.length > 0) {
        html += `<div style="margin-bottom: 5px;">${parts.join(' • ')}</div>`;
      }
      
      parts = [];
      if (fields.email.show && email) {
        parts.push(`<a href="mailto:${email}" style="color: ${primaryColor}; text-decoration: none;">${email}</a>`);
      }
      if (fields.phone.show && phone) {
        parts.push(`<a href="tel:${phone}" style="color: #333; text-decoration: none;">${phone}</a>`);
      }
      
      if (parts.length > 0) {
        html += `<div style="font-size: 0.9em;">${parts.join(' • ')}</div>`;
      }
      
      // Minimal social links
      if (sig.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 8px; font-size: 0.85em;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' • ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
    }
    
    html += '</div>';
    
    return html;
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
        <Checkbox
          checked={signature.enabled}
          onChange={(enabled) => setSignature({ ...signature, enabled })}
        />
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
                  <Checkbox
                    checked={signature.includePhoto}
                    onChange={(checked) => updateSignatureImages(checked, signature.includeLogo)}
                    label="Profile Photo"
                  />
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
                  <Checkbox
                    checked={signature.includeLogo}
                    onChange={(checked) => updateSignatureImages(signature.includePhoto, checked)}
                    label="Company Logo"
                  />
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  <p className="text-xs text-gray-500">Drag to reorder</p>
                </div>
                
                {(signature.fieldOrder || ['name', 'title', 'email', 'phone', 'company', 'address']).map((field) => {
                  const data = signature.fields[field as keyof typeof signature.fields];
                  return (
                    <div
                      key={field}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, field)}
                      className={`space-y-2 p-3 rounded-lg border ${
                        draggedField === field 
                          ? 'border-primary bg-primary/5 opacity-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      } cursor-move transition-all`}
                    >
                      <div className="flex items-center space-x-2">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                        <Checkbox
                          checked={data.show}
                          onChange={(checked) => handleFieldChange(field, 'show', checked)}
                          label={getFieldLabel(field)}
                        />
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
                  );
                })}
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Social Links</h4>
                  <Checkbox
                    checked={signature.includeSocial}
                    onChange={(checked) => setSignature({ ...signature, includeSocial: checked })}
                  />
                </div>
                
                {signature.includeSocial && Object.entries(signature.social).map(([platform, data]) => (
                  <div key={platform} className="space-y-2">
                    <Checkbox
                      checked={data.show}
                      onChange={(checked) => handleSocialChange(platform, 'show', checked)}
                      label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    />
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