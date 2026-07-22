import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, ExternalLink, Copy, Check, ClipboardList } from "lucide-react";
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
          <h2 className="text-3xl tracking-tight">Public Report Form</h2>
          <p className="text-muted-foreground mt-1">
            Bagikan form ini agar pengguna dapat melaporkan masalah tanpa login. Tim IT
            meninjau dan mengarahkan laporan ke Error Report atau Feature Request.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>Buka form publik di tab baru</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.open("/public/submit", "_blank")}>
              Open Public Form
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Share Link
            </CardTitle>
            <CardDescription>Salin URL form publik</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2 bg-gray-50 rounded border text-sm break-all">
              {publicFormUrl}
            </div>
            <Button className="w-full" variant="outline" onClick={copyToClipboard}>
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

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Untuk akses dari ponsel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicFormUrl)}`;
                window.open(qrUrl, "_blank");
              }}
            >
              Generate QR Code
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              What Users Fill In
            </CardTitle>
            <CardDescription>Form sederhana — tanpa klasifikasi teknis</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Reporter name and unit/department</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Title and detailed description of the issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Image evidence (screenshot/photo, optional)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              IT Team's Role
            </CardTitle>
            <CardDescription>Setelah laporan masuk sebagai ticket PUB-*</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Determine category and priority on the Tickets page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Convert to Error Report (hardware/network/software)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Convert to Feature Request or Bug Fix</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Assign to team and track until completion</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">No Login Required</h4>
              <p className="text-sm text-blue-800">
                Pengguna tidak perlu akun. Semua laporan masuk ke menu <strong>Tickets</strong>{" "}
                dengan ID <code className="text-xs">PUB-YYYY-####</code>. Tim IT yang
                menentukan apakah masalah masuk ranah network, hardware, software, atau perlu
                pengembangan fitur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
