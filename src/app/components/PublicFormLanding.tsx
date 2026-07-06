import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, Bug, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

export function PublicFormLanding() {
  const [copied, setCopied] = useState(false);
  const publicFormUrl = `${window.location.origin}/public/submit`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicFormUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Public Submission Form</h2>
          <p className="text-muted-foreground mt-1">
            Share this form with users to collect error reports and feature requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Access Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>
              Open the public form in a new tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.open('/public/submit', '_blank')}
            >
              Open Public Form
            </Button>
          </CardContent>
        </Card>

        {/* Share Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Share Link
            </CardTitle>
            <CardDescription>
              Copy the public form URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2 bg-gray-50 rounded border text-sm break-all">
              {publicFormUrl}
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              Generate a QR code for mobile access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicFormUrl)}`;
                window.open(qrUrl, '_blank');
              }}
            >
              Generate QR Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Error Reports
            </CardTitle>
            <CardDescription>
              Users can submit error reports with the following features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Category selection (Hardware, Network, Software)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Priority levels from Low to Critical</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Error location and impact description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Steps to reproduce the issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>File attachments (screenshots, logs)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Feature Requests
            </CardTitle>
            <CardDescription>
              Users can submit feature requests with the following features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Request type (Feature Request or Bug Fix)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Business justification field</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Expected outcome description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Number of affected users tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Priority assessment</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices for Sharing</CardTitle>
          <CardDescription>
            How to effectively distribute the public form to your users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">📧 Email Distribution</h4>
              <p className="text-sm text-muted-foreground">
                Send the link to department heads and managers. Include it in onboarding emails for new employees.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🌐 Intranet Portal</h4>
              <p className="text-sm text-muted-foreground">
                Add a prominent "Report Issue" button on your company intranet homepage linking to the public form.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📱 Mobile Access</h4>
              <p className="text-sm text-muted-foreground">
                Display QR codes in common areas (break rooms, IT office) for easy mobile access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">No Authentication Required</h4>
              <p className="text-sm text-blue-800">
                The public form is accessible without login, making it easy for any user to submit issues. 
                All submissions will appear in your Error Reports or Feature Requests modules based on the type selected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
