import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { TicketPriority } from "../types";
import { submitPublicRequest } from "../lib/api/services";
import { ApiError } from "../lib/api/client";

type SubmissionType = 'error_report' | 'feature_request';

interface FormData {
  submissionType: SubmissionType;
  
  // Common fields
  title: string;
  description: string;
  priority: TicketPriority;
  
  // Reporter info
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  reporterUnit: string;
  
  // Error Report specific
  errorCategory?: 'hardware' | 'network' | 'software';
  errorLocation?: string;
  errorImpact?: string;
  errorStepsToReproduce?: string;
  
  // Feature Request specific
  requestType?: 'feature_request' | 'bug_fix';
  businessJustification?: string;
  expectedOutcome?: string;
  affectedUsers?: string;
  
  // Attachments
  attachments: File[];
}

export function PublicSubmissionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    submissionType: 'error_report',
    title: '',
    description: '',
    priority: 'medium',
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    reporterUnit: '',
    attachments: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalSize = [...formData.attachments, ...newFiles].reduce((acc, file) => acc + file.size, 0);
      
      // 10MB total limit
      if (totalSize > 10 * 1024 * 1024) {
        toast.error('Total file size exceeds 10MB limit');
        return;
      }
      
      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...newFiles],
      });
    }
  };

  const removeFile = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      const category =
        formData.submissionType === 'error_report'
          ? ({
              hardware: 'hardware_problem',
              network: 'network_issue',
              software: 'software_bug',
            } as const)[formData.errorCategory ?? 'software'] ?? 'system_error'
          : 'feature_request';

      const contextLines: string[] = [];
      if (formData.errorLocation) contextLines.push(`Location: ${formData.errorLocation}`);
      if (formData.errorImpact) contextLines.push(`Impact: ${formData.errorImpact}`);
      if (formData.errorStepsToReproduce)
        contextLines.push(`Steps to reproduce:\n${formData.errorStepsToReproduce}`);
      if (formData.businessJustification)
        contextLines.push(`Business justification:\n${formData.businessJustification}`);
      if (formData.expectedOutcome)
        contextLines.push(`Expected outcome:\n${formData.expectedOutcome}`);
      if (formData.affectedUsers)
        contextLines.push(`Affected users: ${formData.affectedUsers}`);

      const description = [formData.description, ...contextLines]
        .filter(Boolean)
        .join('\n\n');

      const result = await submitPublicRequest({
        submission_type: formData.submissionType,
        title: formData.title,
        description,
        category,
        priority: formData.priority,
        submitter_name: formData.reporterName,
        submitter_email: formData.reporterEmail,
        submitter_phone: formData.reporterPhone || undefined,
        submitter_unit: formData.reporterUnit || undefined,
      }, formData.attachments);

      setReferenceNumber(result.reference_number);
      toast.success('Submission received successfully!');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many submissions. Please try again in a few minutes.');
      } else if (err instanceof ApiError && err.status === 401) {
        toast.error('This form is currently unavailable. Please contact IT support directly.');
      } else if (err instanceof ApiError && err.errors) {
        const first = Object.values(err.errors)[0]?.[0];
        toast.error(first ?? err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : 'Failed to submit. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setReferenceNumber(null);
    setFormData({
      submissionType: 'error_report',
      title: '',
      description: '',
      priority: 'medium',
      reporterName: '',
      reporterEmail: '',
      reporterPhone: '',
      reporterUnit: '',
      attachments: [],
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-lg">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Submission Successful!</CardTitle>
            <CardDescription className="text-base">
              Your {formData.submissionType === 'error_report' ? 'error report' : 'feature request'} has been received.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Our IT team will review your submission and get back to you via email within 24-48 hours.
                You will receive a ticket reference number shortly.
              </AlertDescription>
            </Alert>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Reference:</strong> {referenceNumber ?? '—'}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Submitted by:</strong> {formData.reporterName}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Email:</strong> {formData.reporterEmail}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Date:</strong> {new Date().toLocaleString()}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={resetForm} className="flex-1">
                Submit Another
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.close()}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 border-b bg-white">
            <CardTitle className="text-2xl">IT Support Submission Form</CardTitle>
            <CardDescription>
              Report an issue or submit a feature request to our IT team
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {/* Submission Type */}
              <div className="space-y-3">
                <Label className="text-base">Submission Type *</Label>
                <RadioGroup
                  value={formData.submissionType}
                  onValueChange={(value: SubmissionType) => 
                    setFormData({ ...formData, submissionType: value })
                  }
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="error_report" id="error_report" />
                    <Label htmlFor="error_report" className="flex-1 cursor-pointer">
                      <div className="font-medium">Error Report</div>
                      <div className="text-sm text-gray-500">
                        Report system errors, bugs, or technical issues
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="feature_request" id="feature_request" />
                    <Label htmlFor="feature_request" className="flex-1 cursor-pointer">
                      <div className="font-medium">Feature Request / Bug Fix</div>
                      <div className="text-sm text-gray-500">
                        Request new features or report bugs that need fixing
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Full Name *</Label>
                    <Input
                      id="reporterName"
                      value={formData.reporterName}
                      onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reporterEmail">Email Address *</Label>
                    <Input
                      id="reporterEmail"
                      type="email"
                      value={formData.reporterEmail}
                      onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                      placeholder="john.doe@company.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reporterPhone">Phone Number</Label>
                    <Input
                      id="reporterPhone"
                      type="tel"
                      value={formData.reporterPhone}
                      onChange={(e) => setFormData({ ...formData, reporterPhone: e.target.value })}
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reporterUnit">Department / Unit *</Label>
                    <Input
                      id="reporterUnit"
                      value={formData.reporterUnit}
                      onChange={(e) => setFormData({ ...formData, reporterUnit: e.target.value })}
                      placeholder="e.g., Finance, HR, Operations"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">
                  {formData.submissionType === 'error_report' ? 'Error Details' : 'Request Details'}
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title / Summary *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={
                        formData.submissionType === 'error_report' 
                          ? "e.g., System login error on HR portal"
                          : "e.g., Add export to Excel feature in reports"
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Detailed Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={
                        formData.submissionType === 'error_report'
                          ? "Describe the issue in detail. Include what happened, when it occurred, and any error messages you received..."
                          : "Describe your request in detail. Explain what you need and why it would be beneficial..."
                      }
                      rows={5}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Level *</Label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value: TicketPriority) => 
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex flex-col items-start">
                              <span>Low</span>
                              <span className="text-xs text-gray-500">Minor issue, not urgent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex flex-col items-start">
                              <span>Medium</span>
                              <span className="text-xs text-gray-500">Normal priority</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex flex-col items-start">
                              <span>High</span>
                              <span className="text-xs text-gray-500">Important, needs attention soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="critical">
                            <div className="flex flex-col items-start">
                              <span>Critical</span>
                              <span className="text-xs text-gray-500">Urgent, blocking work</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.submissionType === 'error_report' && (
                      <div className="space-y-2">
                        <Label htmlFor="errorCategory">Error Category *</Label>
                        <Select 
                          value={formData.errorCategory} 
                          onValueChange={(value: 'hardware' | 'network' | 'software') => 
                            setFormData({ ...formData, errorCategory: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hardware">Hardware</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                            <SelectItem value="software">Software</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.submissionType === 'feature_request' && (
                      <div className="space-y-2">
                        <Label htmlFor="requestType">Request Type *</Label>
                        <Select 
                          value={formData.requestType} 
                          onValueChange={(value: 'feature_request' | 'bug_fix') => 
                            setFormData({ ...formData, requestType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="bug_fix">Bug Fix</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {formData.submissionType === 'error_report' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="errorLocation">Location / System Affected</Label>
                        <Input
                          id="errorLocation"
                          value={formData.errorLocation || ''}
                          onChange={(e) => setFormData({ ...formData, errorLocation: e.target.value })}
                          placeholder="e.g., Building A - 3rd Floor, HR Management System"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="errorStepsToReproduce">Steps to Reproduce (if applicable)</Label>
                        <Textarea
                          id="errorStepsToReproduce"
                          value={formData.errorStepsToReproduce || ''}
                          onChange={(e) => setFormData({ ...formData, errorStepsToReproduce: e.target.value })}
                          placeholder="1. Go to login page&#10;2. Enter credentials&#10;3. Click login button&#10;4. Error appears"
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="errorImpact">Impact on Work</Label>
                        <Textarea
                          id="errorImpact"
                          value={formData.errorImpact || ''}
                          onChange={(e) => setFormData({ ...formData, errorImpact: e.target.value })}
                          placeholder="Describe how this issue affects your work or operations..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {formData.submissionType === 'feature_request' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="businessJustification">Business Justification</Label>
                        <Textarea
                          id="businessJustification"
                          value={formData.businessJustification || ''}
                          onChange={(e) => setFormData({ ...formData, businessJustification: e.target.value })}
                          placeholder="Explain why this feature/fix is needed and how it will benefit the organization..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expectedOutcome">Expected Outcome</Label>
                        <Textarea
                          id="expectedOutcome"
                          value={formData.expectedOutcome || ''}
                          onChange={(e) => setFormData({ ...formData, expectedOutcome: e.target.value })}
                          placeholder="Describe what you expect to happen when this is implemented..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="affectedUsers">Number of Affected Users / Departments</Label>
                        <Input
                          id="affectedUsers"
                          value={formData.affectedUsers || ''}
                          onChange={(e) => setFormData({ ...formData, affectedUsers: e.target.value })}
                          placeholder="e.g., 50 users in Finance department"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* File Attachments */}
              <div className="border-t pt-6">
                <div className="space-y-3">
                  <Label>Attachments (Optional)</Label>
                  <div className="text-sm text-gray-500 mb-2">
                    Upload screenshots, documents, or other relevant files (Max 10MB total)
                  </div>
                  
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="fileUpload"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <div className="text-sm">
                        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF, DOC, XLS (MAX 10MB)
                      </div>
                    </label>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Attached Files:</div>
                      {formData.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{file.name}</div>
                              <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500">
                        Total size: {formatFileSize(formData.attachments.reduce((acc, file) => acc + file.size, 0))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="border-t pt-6 flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Reset
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Fields marked with * are required. By submitting this form, you agree to our IT support terms and conditions.
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Need immediate assistance? Contact IT Support: support@company.com | Ext. 1234</p>
        </div>
      </div>
    </div>
  );
}
