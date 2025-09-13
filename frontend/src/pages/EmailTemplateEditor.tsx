import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  EyeIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  design_json: any;
  html_output: string;
  category: string;
  is_active: boolean;
}

const EmailTemplateEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const emailEditorRef = useRef<any>(null);
  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    subject: '',
    design_json: {},
    html_output: '',
    category: 'general',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [currentId, setCurrentId] = useState(id);

  useEffect(() => {
    console.log('=== COMPONENT MOUNTED/ID CHANGED ===');
    console.log('URL ID param:', id);
    console.log('Current ID state:', currentId);
    if (id && id !== 'new') {
      fetchTemplate();
    }
  }, [id]);

  useEffect(() => {
    console.log('=== COMPONENT MOUNT ===');
    console.log('Component mounted at:', new Date().toISOString());

    return () => {
      console.log('=== COMPONENT UNMOUNT ===');
      console.log('Component unmounting at:', new Date().toISOString());
    };
  }, []);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/email-templates/${id}`);
      setTemplate(response.data);
      
      // Load the design into the editor when ready
      const unlayer = emailEditorRef.current?.editor;
      if (unlayer && response.data.design_json) {
        unlayer.loadDesign(response.data.design_json);
      }
    } catch (error) {
      toast.error('Failed to load template');
      navigate('/email-templates');
    } finally {
      setLoading(false);
    }
  };

  const onReady = () => {
    console.log('=== UNLAYER EDITOR READY ===');
    console.log('Editor ready at:', new Date().toISOString());

    // Editor is ready
    const unlayer = emailEditorRef.current?.editor;
    console.log('Editor reference exists:', !!unlayer);

    // Load existing design if editing
    if (unlayer && template.design_json && Object.keys(template.design_json).length > 0) {
      console.log('Loading existing design into editor');
      unlayer.loadDesign(template.design_json);
    } else {
      console.log('No existing design to load');
    }
  };

  const handleSave = async () => {
    console.log('=== SAVE CLICKED ===');
    console.log('Current template state:', template);
    console.log('Current ID from URL:', id);
    console.log('Current ID state:', currentId);

    if (!template.name || template.name.trim() === '') {
      toast.error('Template name is required');
      return;
    }

    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) {
      toast.error('Editor not ready');
      return;
    }

    console.log('Editor reference exists:', !!unlayer);
    setSaving(true);

    // Simple approach - just use exportHtml without any options
    unlayer.exportHtml((data: any) => {
      try {
        const { design, html } = data || {};
        console.log('=== EXPORT DATA ===');
        console.log('Full export data:', data);
        console.log('Design object exists:', !!design);
        console.log('HTML exists:', !!html);
        console.log('HTML length:', html?.length || 0);

        // Save even if design is empty/null
        saveTemplate(design || {}, html || '');
      } catch (error) {
        console.error('Error in exportHtml callback:', error);
        // Save with empty design if there's an error
        saveTemplate({}, '');
      }
    });
  };

  const saveTemplate = async (design: any, html: string) => {
    console.log('=== SAVE TEMPLATE CALLED ===');
    console.log('Design to save:', design);
    console.log('HTML to save length:', html?.length || 0);
    console.log('Is new template?', !currentId || currentId === 'new');

    try {
      const templateData = {
        ...template,
        design_json: design,
        html_output: html
      };

      if (currentId && currentId !== 'new') {
        console.log('Updating existing template:', currentId);
        await api.put(`/email-templates/${currentId}`, templateData);
        toast.success('Template updated');
        // Update local state with the saved design
        setTemplate(prev => ({
          ...prev,
          design_json: design,
          html_output: html
        }));
        console.log('Template updated successfully');
      } else {
        console.log('Creating new template...');
        const response = await api.post('/email-templates', templateData);
        console.log('Create response:', response.data);
        toast.success('Template created');

        // Update local state with the saved template
        setTemplate(prev => ({
          ...prev,
          id: response.data.id,
          design_json: design,
          html_output: html
        }));

        // Update currentId so next save will use PUT instead of POST
        const newId = response.data.id;
        console.log('Setting currentId to:', newId);
        setCurrentId(newId);

        // Don't navigate - just update the URL in the browser without React Router
        const newUrl = `/email-templates/${newId}`;
        console.log('Updating browser URL to:', newUrl);
        window.history.replaceState({}, '', newUrl);

        console.log('=== AFTER SAVE ===');
        console.log('Template state will be updated with design');
        console.log('Current URL:', window.location.pathname);
        console.log('Editor should remain intact');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
      console.log('Save process complete');
    }
  };

  const handlePreview = () => {
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    unlayer.exportHtml((data: any) => {
      setPreviewHtml(data?.html || '');
      setShowPreview(true);
    });
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    unlayer.exportHtml(async (data: any) => {
      try {
        await api.post('/emails/send-test', {
          to: testEmail,
          subject: template.subject || 'Test Email',
          html: data?.html || ''
        });

        toast.success(`Test email sent to ${testEmail}`);
        setShowTestEmail(false);
        setTestEmail('');
      } catch (error) {
        toast.error('Failed to send test email');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/email-templates')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template Name"
                className="text-lg font-semibold bg-transparent border-0 focus:outline-none focus:ring-0"
              />
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email Subject"
                className="block text-sm text-gray-600 bg-transparent border-0 focus:outline-none focus:ring-0 mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={template.category}
              onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="general">General</option>
              <option value="marketing">Marketing</option>
              <option value="transactional">Transactional</option>
              <option value="newsletter">Newsletter</option>
            </select>
            
            <button
              onClick={handlePreview}
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              Preview
            </button>
            
            <button
              onClick={() => setShowTestEmail(true)}
              className="inline-flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Send Test
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Editor */}
      <div className="flex-1 overflow-hidden">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          minHeight="100%"
        />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="border rounded-lg p-4">
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-500">Subject:</p>
                  <p className="font-medium">{template.subject || 'No subject'}</p>
                </div>
                <div 
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showTestEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowTestEmail(false);
                  setTestEmail('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateEditor;