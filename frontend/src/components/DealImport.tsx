import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, ChevronRight, Download } from 'lucide-react';
import api from '../services/api';

interface CSVPreview {
  headers: string[];
  preview: Record<string, any>[];
  suggestedMapping: Record<string, string>;
  stages: Array<{
    id: string;
    name: string;
    order: number;
  }>;
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

interface DealImportProps {
  onClose?: () => void;
}

const DealImport: React.FC<DealImportProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [stageMapping, setStageMapping] = useState<Record<string, string>>({});
  const [contactStrategy, setContactStrategy] = useState<'match' | 'create' | 'skip'>('create');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create'>('skip');
  const [defaultStageId, setDefaultStageId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'results'>('upload');
  const [jobId, setJobId] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const progressCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const standardFields = [
    { value: 'name', label: 'Deal Name' },
    { value: 'value', label: 'Value' },
    { value: 'stage', label: 'Stage' },
    { value: 'status', label: 'Status (open/won/lost)' },
    { value: 'expectedCloseDate', label: 'Expected Close Date' },
    { value: 'notes', label: 'Notes' },
    { value: 'contactEmail', label: 'Contact Email' },
    { value: 'contactFirstName', label: 'Contact First Name' },
    { value: 'contactLastName', label: 'Contact Last Name' },
    { value: 'contactName', label: 'Contact Name (Full)' },
    { value: 'company', label: 'Company' }
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
      const response = await api.post('/deals/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPreview(response.data);
      setFieldMapping(response.data.suggestedMapping);
      setDefaultStageId(response.data.stages[0]?.id || '');
      
      // Auto-detect stage mappings
      const stageMappings: Record<string, string> = {};
      response.data.headers.forEach((header: string) => {
        const normalized = header.toLowerCase();
        response.data.stages.forEach((stage: any) => {
          if (normalized.includes(stage.name.toLowerCase())) {
            stageMappings[header] = stage.id;
          }
        });
      });
      setStageMapping(stageMappings);
      
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to preview file');
    }
  };

  const checkImportProgress = async (jobId: string) => {
    try {
      const response = await api.get(`/deals/import/status/${jobId}`);
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

    // For large files (> 500 rows), use chunked import
    const useChunkedImport = preview.totalRows > 500;

    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));
    formData.append('stageMapping', JSON.stringify(stageMapping));
    formData.append('contactStrategy', contactStrategy);
    formData.append('duplicateStrategy', duplicateStrategy);
    formData.append('defaultStageId', defaultStageId);

    try {
      if (useChunkedImport) {
        // Use the new chunked import endpoint
        const response = await api.post('/deals/import/start', formData, {
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
        const response = await api.post('/deals/import', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        setResults(response.data.results);
        setStep('results');
        setImporting(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import deals');
      setImporting(false);
    }
  };

  const handleMappingChange = (csvField: string, dealField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvField]: dealField
    }));
  };

  const handleStageMappingChange = (csvValue: string, stageId: string) => {
    setStageMapping(prev => ({
      ...prev,
      [csvValue]: stageId
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
    setStageMapping({});
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

  // Get unique stage values from preview data
  const getUniqueStageValues = () => {
    if (!preview || !fieldMapping.stage) return [];
    
    const stageFieldIndex = preview.headers.findIndex(h => fieldMapping[h] === 'stage');
    if (stageFieldIndex === -1) return [];
    
    const uniqueValues = new Set<string>();
    preview.preview.forEach(row => {
      const value = row[preview.headers[stageFieldIndex]];
      if (value) uniqueValues.add(value);
    });
    
    return Array.from(uniqueValues);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 sm:p-4">
      <div className="modal-mobile bg-white overflow-hidden sm:max-w-5xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-mobile py-3 sm:py-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-mobile-xl font-bold">Import Deals</h2>
              <p className="text-mobile-sm text-gray-600 mt-0.5 truncate">
                {step === 'upload' && 'Upload CSV file'}
                {step === 'mapping' && 'Map columns & configure'}
                {step === 'importing' && 'Importing deals...'}
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
                <span className="btn-mobile bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium">
                  Choose File
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-4">Maximum file size: 5MB</p>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && preview && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">{file?.name}</span>
                  <span className="text-blue-600">• {preview.totalRows} rows</span>
                </div>
              </div>

              {/* Import Options */}
              <div className="mb-6 space-y-6">
                {/* Contact Strategy */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Contact Association</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    How should we handle contacts when importing deals? <span className="font-medium text-gray-800">(All deals require a contact)</span>
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="match"
                        checked={contactStrategy === 'match'}
                        onChange={(e) => setContactStrategy(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">Match existing contacts</div>
                        <div className="text-sm text-gray-600">Link deals to existing contacts by email or name</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="create"
                        checked={contactStrategy === 'create'}
                        onChange={(e) => setContactStrategy(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">Create new contacts</div>
                        <div className="text-sm text-gray-600">Create new contacts if they don't exist</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="skip"
                        checked={contactStrategy === 'skip'}
                        onChange={(e) => setContactStrategy(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">Skip if no contact</div>
                        <div className="text-sm text-gray-600">Only import deals with matching contacts</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Duplicate Strategy */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Duplicate Handling</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    How should we handle deals with the same name and contact?
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
                        <div className="text-sm text-gray-600">Don't import deals that already exist</div>
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
                        <div className="text-sm text-gray-600">Update deals with matching name and contact</div>
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
                        <div className="text-sm text-gray-600">Create new deals even if they exist</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Default Stage */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Default Stage</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Select the default stage for deals without a stage value
                  </p>
                  <select
                    value={defaultStageId}
                    onChange={(e) => setDefaultStageId(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    {preview.stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field Mapping */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Field Mapping</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Map your CSV columns to deal fields. We've suggested some mappings based on your column names.
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

              {/* Stage Mapping */}
              {fieldMapping.stage && getUniqueStageValues().length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Stage Mapping</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Map CSV stage values to your pipeline stages
                  </p>
                  <div className="space-y-3">
                    {getUniqueStageValues().map((csvStage) => (
                      <div key={csvStage} className="flex items-center gap-4">
                        <div className="w-1/3 font-medium text-gray-700">{csvStage}</div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <select
                          value={stageMapping[csvStage] || ''}
                          onChange={(e) => handleStageMappingChange(csvStage, e.target.value)}
                          className="flex-1 p-2 border rounded-lg"
                        >
                          <option value="">-- Use default stage --</option>
                          {preview.stages.map(stage => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                              <div className="text-blue-600 normal-case mt-1">
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
                            <td key={header} className="px-4 py-3 text-sm text-gray-900">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <h3 className="text-xl font-medium">Importing Deals...</h3>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing {importJob.processedRecords} of {importJob.totalRecords} records</span>
                    <span>{Math.round(importJob.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${importJob.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{importJob.created}</div>
                    <div className="text-green-700">Created</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-800">{importJob.updated}</div>
                    <div className="text-blue-700">Updated</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-gray-800">{importJob.skipped}</div>
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
                    <div className="text-green-700">Deals Created</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-800">{results.updated}</div>
                    <div className="text-blue-700">Deals Updated</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-gray-800">{results.skipped}</div>
                    <div className="text-gray-700">Rows Skipped</div>
                  </div>
                </div>

                {results.skipped > 0 && jobId && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-yellow-800">
                          {results.skipped} duplicate {results.skipped === 1 ? 'deal was' : 'deals were'} skipped
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `/api/deals/import/skipped/${jobId}`;
                          link.download = `skipped-deals-${new Date().toISOString().split('T')[0]}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-white border border-yellow-300 rounded hover:bg-yellow-50"
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
                              <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
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
              className="btn-mobile text-gray-700 hover:text-gray-900 font-medium"
              disabled={step === 'importing'}
            >
              {step === 'results' ? 'Import Another' : 'Cancel'}
            </button>
            <div className="flex gap-3">
              {step === 'mapping' && (
                <>
                  <button
                    onClick={() => setStep('upload')}
                    className="btn-mobile border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || !Object.values(fieldMapping).includes('name')}
                    className="btn-mobile bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <span className="hidden sm:inline">{importing ? 'Importing...' : `Import ${preview?.totalRows} Deals`}</span>
                    <span className="sm:hidden">{importing ? 'Importing...' : 'Import'}</span>
                  </button>
                </>
              )}
              {step === 'results' && (
                <button
                  onClick={onClose || (() => window.location.reload())}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Deals
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealImport;