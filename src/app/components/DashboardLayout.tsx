import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Dashboard } from "./Dashboard";
import { ErrorReports } from "./ErrorReports";
import { FeatureRequests } from "./FeatureRequests";
import { DowntimeMonev } from "./DowntimeMonev";
import { TeamPerformance } from "./TeamPerformance";
import { Settings } from "./Settings";
import { PublicFormLanding } from "./PublicFormLanding";
import { UserManagement } from "./UserManagement";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TicketPriority, DowntimeType } from "../types";
import { createTicket, createDowntimeRecord } from "../lib/api/services";

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState("/");
  const [quickActionDialog, setQuickActionDialog] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeView) {
      case "/":
        return <Dashboard />;
      case "/error-reports":
        return <ErrorReports />;
      case "/feature-requests":
        return <FeatureRequests />;
      case "/downtime":
        return <DowntimeMonev />;
      case "/team-performance":
        return <TeamPerformance />;
      case "/public-form":
        return <PublicFormLanding />;
      case "/calendar":
        return (
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl tracking-tight">Calendar View</h2>
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Interactive calendar for planned maintenance and deadlines coming soon...
              </p>
            </div>
          </div>
        );
      case "/settings":
        return <Settings />;
      case "/users":
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  const handleQuickAction = (actionId: string) => {
    setQuickActionDialog(actionId);
  };

  const closeQuickAction = () => {
    setQuickActionDialog(null);
  };

  const renderQuickActionDialog = () => {
    switch (quickActionDialog) {
      case 'new-ticket':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogDescription>
                  Quickly create a new ticket or report an issue
                </DialogDescription>
              </DialogHeader>
              <QuickNewTicketForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'log-downtime':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log Downtime Event</DialogTitle>
                <DialogDescription>
                  Record a planned or unplanned downtime
                </DialogDescription>
              </DialogHeader>
              <QuickDowntimeForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'assign-ticket':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Assign</DialogTitle>
                <DialogDescription>
                  Assign tickets to team members
                </DialogDescription>
              </DialogHeader>
              <QuickAssignForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'export-reports':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Export Reports</DialogTitle>
                <DialogDescription>
                  Export system reports and analytics
                </DialogDescription>
              </DialogHeader>
              <QuickExportForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />
        <SidebarInset className="flex-1 flex flex-col">
          <AppHeader onNavigate={setActiveView} onOpenQuickAction={handleQuickAction} />
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
      
      {/* Quick Action Dialogs */}
      {renderQuickActionDialog()}
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
        }}
      />
    </SidebarProvider>
  );
}

// Quick action forms
function QuickNewTicketForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    category: 'system_error' as const
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
      });
      toast.success('Ticket created successfully');
      onClose();
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of the issue"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description..."
          rows={3}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system_error">System Error</SelectItem>
              <SelectItem value="software_bug">Software Bug</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="network_issue">Network Issue</SelectItem>
              <SelectItem value="hardware_problem">Hardware Problem</SelectItem>
              <SelectItem value="performance_issue">Performance Issue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}

function QuickDowntimeForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'unplanned' as DowntimeType,
    reason: '',
    impact: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    startTime: new Date().toISOString().slice(0, 16)
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createDowntimeRecord({
        title: formData.title,
        type: formData.type,
        reason: formData.reason,
        impact: formData.impact,
        start_time: new Date(formData.startTime).toISOString().slice(0, 19).replace('T', ' '),
      });
      toast.success('Downtime logged successfully');
      onClose();
    } catch {
      toast.error('Failed to log downtime');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief title for the downtime event"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value: DowntimeType) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned Maintenance</SelectItem>
              <SelectItem value="unplanned">Unplanned Outage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="impact">Impact</Label>
          <Select value={formData.impact} onValueChange={(value: any) => setFormData({ ...formData, impact: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Reason for downtime"
          required
        />
      </div>

      <div>
        <Label htmlFor="startTime">Start Time</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Logging...' : 'Log Downtime'}
        </Button>
      </div>
    </form>
  );
}

function QuickAssignForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quick assign functionality would be implemented here, allowing team leads and admins to quickly assign tickets to team members.
      </p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function QuickExportForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Export functionality would be implemented here, allowing admins to export reports in various formats (PDF, Excel, CSV).
      </p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}