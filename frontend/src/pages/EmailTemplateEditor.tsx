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

  // Debug logging helper that saves to localStorage
  const debugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);

    // Save to localStorage
    const existingLogs = localStorage.getItem('emailTemplateDebugLogs') || '';
    const newLog = data
      ? `${logEntry}\n${JSON.stringify(data, null, 2)}\n`
      : `${logEntry}\n`;
    localStorage.setItem('emailTemplateDebugLogs', existingLogs + newLog);
  };

  // Clear debug logs on mount
  useEffect(() => {
    localStorage.setItem('emailTemplateDebugLogs', '');
    debugLog('=== DEBUG SESSION STARTED ===');
  }, []);

  useEffect(() => {
    debugLog('=== COMPONENT MOUNTED/ID CHANGED ===', {
      urlIdParam: id,
      currentIdState: currentId
    });
    if (id && id !== 'new') {
      fetchTemplate();
    }
  }, [id]);

  useEffect(() => {
    debugLog('=== COMPONENT MOUNT ===');

    return () => {
      debugLog('=== COMPONENT UNMOUNT ===');
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
    debugLog('=== UNLAYER EDITOR READY ===');

    // Editor is ready
    const unlayer = emailEditorRef.current?.editor;
    debugLog('Editor reference check', { exists: !!unlayer });

    // Load existing design if editing
    if (unlayer && template.design_json && Object.keys(template.design_json).length > 0) {
      debugLog('Loading existing design into editor');
      unlayer.loadDesign(template.design_json);
    } else {
      debugLog('No existing design to load');
    }
  };

  const handleSave = async () => {
    debugLog('=== SAVE CLICKED ===', {
      templateName: template.name,
      urlId: id,
      currentIdState: currentId
    });

    if (!template.name || template.name.trim() === '') {
      toast.error('Template name is required');
      return;
    }

    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) {
      toast.error('Editor not ready');
      return;
    }

    debugLog('Editor reference check before save', { exists: !!unlayer });
    setSaving(true);

    // Simple approach - just use exportHtml without any options
    unlayer.exportHtml((data: any) => {
      try {
        const { design, html } = data || {};
        debugLog('=== EXPORT DATA ===', {
          hasDesign: !!design,
          hasHtml: !!html,
          htmlLength: html?.length || 0,
          designKeys: design ? Object.keys(design) : []
        });

        // Save even if design is empty/null
        saveTemplate(design || {}, html || '');
      } catch (error) {
        debugLog('Error in exportHtml callback', { error: error instanceof Error ? error.message : String(error) });
        // Save with empty design if there's an error
        saveTemplate({}, '');
      }
    });
  };

  const saveTemplate = async (design: any, html: string) => {
    debugLog('=== SAVE TEMPLATE CALLED ===', {
      htmlLength: html?.length || 0,
      isNewTemplate: !currentId || currentId === 'new',
      currentId: currentId
    });

    try {
      const templateData = {
        ...template,
        design_json: design,
        html_output: html
      };

      if (currentId && currentId !== 'new') {
        debugLog('Updating existing template', { id: currentId });
        await api.put(`/email-templates/${currentId}`, templateData);
        toast.success('Template updated');
        // Update local state with the saved design
        setTemplate(prev => ({
          ...prev,
          design_json: design,
          html_output: html
        }));
        debugLog('Template updated successfully');
      } else {
        debugLog('Creating new template...');
        const response = await api.post('/email-templates', templateData);
        debugLog('Create response', { id: response.data.id });
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
        debugLog('Setting currentId', { newId });
        setCurrentId(newId);

        // Don't navigate - just update the URL in the browser without React Router
        const newUrl = `/email-templates/${newId}`;
        debugLog('Updating browser URL', { newUrl, currentPath: window.location.pathname });
        window.history.replaceState({}, '', newUrl);

        debugLog('=== AFTER SAVE ===', {
          templateUpdated: true,
          currentUrl: window.location.pathname,
          editorShouldRemainIntact: true
        });

        // Check if component remounts after this
        setTimeout(() => {
          debugLog('=== POST-SAVE CHECK (1 second later) ===', {
            stillMounted: true,
            currentUrl: window.location.pathname,
            editorRef: !!emailEditorRef.current?.editor
          });
        }, 1000);
      }
    } catch (error) {
      debugLog('Save error', { error: error instanceof Error ? error.message : String(error) });
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
      debugLog('Save process complete');
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

  const downloadDebugLogs = () => {
    const logs = localStorage.getItem('emailTemplateDebugLogs') || 'No logs found';
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-editor-debug-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Debug logs downloaded');
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

            <button
              onClick={downloadDebugLogs}
              className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              title="Download debug logs for troubleshooting"
            >
              🐛 Debug
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