import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, ChevronRight, Download } from 'lucide-react';
import api from '../services/api';

interface CSVPreview {
  headers: string[];
  preview: Record<string, any>[];
  suggestedMapping: Record<string, string>;
  customFields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  totalRows: number;
}

interface ImportResults {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

interface ImportJob {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  errorCount: number;
  progress: number;
  completedAt?: string;
  duration?: number;
}

interface ContactImportProps {
  onClose?: () => void;
}

const ContactImport: React.FC<ContactImportProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create'>('skip');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'results'>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const progressCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const standardFields = [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' },
    { value: 'position', label: 'Position' },
    { value: 'tags', label: 'Tags (comma-separated)' },
    { value: 'notes', label: 'Notes' }
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Upload for preview
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/contacts/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPreview(response.data);
      setFieldMapping(response.data.suggestedMapping);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to preview file');
    }
  };

  const checkImportProgress = async (jobId: string) => {
    try {
      const response = await api.get(`/contacts/import/status/${jobId}`);
      const job = response.data;
      setImportJob(job);

      if (job.status === 'completed' || job.status === 'failed') {
        // Stop checking progress
        if (progressCheckInterval.current) {
          clearInterval(progressCheckInterval.current);
          progressCheckInterval.current = null;
        }

        if (job.status === 'completed') {
          setResults({
            created: job.created,
            updated: job.updated,
            skipped: job.skipped,
            errors: job.errors
          });
          setStep('results');
        } else {
          setError('Import failed. Please try again.');
          setStep('mapping');
        }
        setImporting(false);
      }
    } catch (err) {
      console.error('Failed to check import progress:', err);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    // For large files (> 1000 rows), use chunked import
    const useChunkedImport = preview.totalRows > 1000;

    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));
    formData.append('duplicateStrategy', duplicateStrategy);

    try {
      if (useChunkedImport) {
        // Use the new chunked import endpoint
        const response = await api.post('/contacts/import/start', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        setJobId(response.data.jobId);
        setStep('importing');
        
        // Start checking progress every second
        progressCheckInterval.current = setInterval(() => {
          checkImportProgress(response.data.jobId);
        }, 1000);
        
        // Initial check
        checkImportProgress(response.data.jobId);
      } else {
        // Use the original import endpoint for smaller files
        const response = await api.post('/contacts/import', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        setResults(response.data.results);
        setStep('results');
        setImporting(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import contacts');
      setImporting(false);
    }
  };

  const handleMappingChange = (csvField: string, contactField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvField]: contactField
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      const event = {
        target: {
          files: [droppedFile]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    } else {
      setError('Please drop a CSV file');
    }
  };

  const resetImport = () => {
    // Clear any progress checking interval
    if (progressCheckInterval.current) {
      clearInterval(progressCheckInterval.current);
      progressCheckInterval.current = null;
    }
    
    setFile(null);
    setPreview(null);
    setFieldMapping({});
    setResults(null);
    setError(null);
    setStep('upload');
    setJobId(null);
    setImportJob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (progressCheckInterval.current) {
        clearInterval(progressCheckInterval.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 sm:p-4">
      <div className="modal-mobile bg-white overflow-hidden sm:max-w-4xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-mobile py-3 sm:py-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-mobile-xl font-bold">Import Contacts</h2>
              <p className="text-mobile-sm text-gray-600 mt-0.5 truncate">
                {step === 'upload' && 'Upload CSV file'}
                {step === 'mapping' && 'Map columns'}
                {step === 'importing' && 'Importing...'}
                {step === 'results' && 'Import completed'}
              </p>
            </div>
            <button
              onClick={onClose || (() => window.location.reload())}
              className="text-gray-500 hover:text-gray-700 touch-target flex items-center justify-center"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-mobile overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)', minHeight: '60vh' }}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
              <p className="text-gray-600 mb-4">or</p>
              <label className="inline-block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="btn-mobile bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer font-medium">
                  Choose File
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-4">Maximum file size: 5MB</p>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && preview && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-primary-dark">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">{file?.name}</span>
                  <span className="text-primary">• {preview.totalRows} rows</span>
                </div>
              </div>

              {/* Duplicate Strategy */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Duplicate Handling</h3>
                <p className="text-gray-600 text-sm mb-3">
                  How should we handle contacts with matching email addresses?
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="skip"
                      checked={duplicateStrategy === 'skip'}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">Skip duplicates</div>
                      <div className="text-sm text-gray-600">Don't import contacts with existing emails</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="update"
                      checked={duplicateStrategy === 'update'}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">Update existing</div>
                      <div className="text-sm text-gray-600">Update contacts with matching emails</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="create"
                      checked={duplicateStrategy === 'create'}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">Create new</div>
                      <div className="text-sm text-gray-600">Create new contacts even if email exists</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Field Mapping */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Field Mapping</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Map your CSV columns to contact fields. We've suggested some mappings based on your column names.
                </p>
                <div className="space-y-3">
                  {preview.headers.map((header) => (
                    <div key={header} className="flex items-center gap-4">
                      <div className="w-1/3 font-medium text-gray-700">{header}</div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <select
                        value={fieldMapping[header] || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="flex-1 p-2 border rounded-lg"
                      >
                        <option value="">-- Skip this field --</option>
                        <optgroup label="Standard Fields">
                          {standardFields.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </optgroup>
                        {preview.customFields.length > 0 && (
                          <optgroup label="Custom Fields">
                            {preview.customFields.map(field => (
                              <option key={field.name} value={field.name}>
                                {field.label} {field.required && '*'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-lg font-medium mb-3">Preview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.headers.map(header => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                            {fieldMapping[header] && (
                              <div className="text-primary normal-case mt-1">
                                → {standardFields.find(f => f.value === fieldMapping[header])?.label || 
                                   preview.customFields.find(f => f.name === fieldMapping[header])?.label}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.preview.map((row, index) => (
                        <tr key={index}>
                          {preview.headers.map(header => (
                            <td key={header} className="px-4 py-3 text-sm text-primary-dark">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Importing Progress */}
          {step === 'importing' && importJob && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <h3 className="text-xl font-medium">Importing Contacts...</h3>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing {importJob.processedRecords} of {importJob.totalRecords} records</span>
                    <span>{Math.round(importJob.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${importJob.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{importJob.created}</div>
                    <div className="text-green-700">Created</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-primary-dark">{importJob.updated}</div>
                    <div className="text-primary-dark">Updated</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{importJob.skipped}</div>
                    <div className="text-gray-700">Skipped</div>
                  </div>
                </div>

                {importJob.errorCount > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-yellow-800">
                      <span className="font-medium">{importJob.errorCount} errors</span> encountered during import
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && results && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <h3 className="text-xl font-medium">Import Completed</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{results.created}</div>
                    <div className="text-green-700">Contacts Created</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-primary-dark">{results.updated}</div>
                    <div className="text-primary-dark">Contacts Updated</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{results.skipped}</div>
                    <div className="text-gray-700">Rows Skipped</div>
                  </div>
                </div>

                {results.skipped > 0 && jobId && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-yellow-800">
                          {results.skipped} duplicate {results.skipped === 1 ? 'contact was' : 'contacts were'} skipped
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `/api/contacts/import/skipped/${jobId}`;
                          link.download = `skipped-contacts-${new Date().toISOString().split('T')[0]}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="desktop-only flex items-center gap-2 px-3 py-1 text-sm bg-white border border-yellow-300 rounded hover:bg-yellow-50"
                      >
                        <Download className="w-4 h-4" />
                        Download Skipped Records
                      </button>
                    </div>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Import Errors</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.errors.map((error, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-primary-dark">{error.row}</td>
                              <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-mobile border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={resetImport}
              className="btn-mobile text-gray-700 hover:text-primary-dark font-medium"
              disabled={step === 'importing'}
            >
              {step === 'results' ? 'Import Another' : 'Cancel'}
            </button>
            <div className="flex gap-3">
              {step === 'mapping' && (
                <>
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || !Object.keys(fieldMapping).some(k => fieldMapping[k])}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : `Import ${preview?.totalRows} Contacts`}
                  </button>
                </>
              )}
              {step === 'results' && (
                <button
                  onClick={onClose || (() => window.location.reload())}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  View Contacts
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactImport;