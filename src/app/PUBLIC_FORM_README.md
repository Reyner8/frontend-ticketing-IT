# Public Submission Form - Quick Start Guide

## 🎯 Overview

Your IT Ticketing System now includes a **Public Submission Form** that allows users to submit error reports and feature requests **without needing to log in**!

## 🔗 Access URLs

### For Users (Public Access - No Login Required)
```
https://your-domain.com/public/submit
```
Share this link with anyone who needs to report issues or request features.

### For Admins (Dashboard Access)
```
https://your-domain.com/
```
Login to access the full dashboard and manage submissions.

Within the dashboard, click **"Public Form"** in the sidebar to:
- Copy the shareable link
- Generate QR codes
- View form features and best practices

## ✨ Key Features

### 📝 Two Submission Types

**1. Error Reports**
- Hardware/Network/Software categorization
- Priority levels (Low → Critical)
- Error location and impact tracking
- Steps to reproduce
- File attachments support

**2. Feature Requests & Bug Fixes**
- Business justification field
- Expected outcome description
- Affected users tracking
- Priority assessment

### 📎 File Uploads
- Supports images, PDFs, documents
- Up to 10MB total
- Multiple file upload
- Drag-and-drop interface

### 📱 User Experience
- Clean, Google Forms-like interface
- Fully responsive (mobile, tablet, desktop)
- No authentication required
- Instant confirmation with reference number
- Email notification promise

## 🚀 How to Share the Form

### 1. Via Email
```
Subject: IT Support - Submit Issues Online

Hi Team,

You can now submit IT support requests online:
🔗 https://your-domain.com/public/submit

No login required - just fill out the form!

Best,
IT Support Team
```

### 2. Via QR Code
1. Open the dashboard → Click "Public Form" in sidebar
2. Click "Generate QR Code"
3. Print and display in common areas

### 3. Via Intranet
Add a prominent button/link on your company intranet homepage.

### 4. Via Email Signature
IT staff can add to their email signatures:
```
📝 Submit IT Issues: https://your-domain.com/public/submit
```

## 🔧 Customization

### Update Contact Information
Edit `/components/PublicSubmissionForm.tsx`:
```typescript
// At the bottom of the form
<p>Need immediate assistance? Contact IT Support: your-email@company.com | Ext. 1234</p>
```

### Change File Upload Limit
Edit `/components/PublicSubmissionForm.tsx`:
```typescript
// Change 10MB limit (currently at line ~66)
if (totalSize > 10 * 1024 * 1024) { // Change 10 to desired MB
```

### Modify Priority Descriptions
Edit the priority select options in `/components/PublicSubmissionForm.tsx`:
```typescript
<SelectItem value="critical">
  <div className="flex flex-col items-start">
    <span>Critical</span>
    <span className="text-xs text-gray-500">Your custom description</span>
  </div>
</SelectItem>
```

## 🔌 Backend Integration (When Ready)

Replace the mock submission in `/components/PublicSubmissionForm.tsx`:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (key !== 'attachments') {
        formDataToSend.append(key, formData[key]);
      }
    });
    
    // Add file attachments
    formData.attachments.forEach(file => {
      formDataToSend.append('attachments', file);
    });

    const response = await fetch('/api/public/submit', {
      method: 'POST',
      body: formDataToSend,
    });

    if (response.ok) {
      const result = await response.json();
      toast.success(`Ticket #${result.ticketId} created!`);
      setSubmitted(true);
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    toast.error('Failed to submit. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

## 📊 Form Data Structure

Submissions include:

```typescript
{
  // Submission Type
  submissionType: 'error_report' | 'feature_request',
  
  // Common Fields
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high' | 'critical',
  
  // Reporter Info
  reporterName: string,
  reporterEmail: string,
  reporterPhone: string,
  reporterUnit: string,
  
  // Error Report Specific
  errorCategory?: 'hardware' | 'network' | 'software',
  errorLocation?: string,
  errorImpact?: string,
  errorStepsToReproduce?: string,
  
  // Feature Request Specific
  requestType?: 'feature_request' | 'bug_fix',
  businessJustification?: string,
  expectedOutcome?: string,
  affectedUsers?: string,
  
  // Attachments
  attachments: File[]
}
```

## 🔒 Security Recommendations

For production deployment:

1. **Rate Limiting**
   - Limit submissions per IP address
   - Example: 5 submissions per hour

2. **CAPTCHA**
   - Add Google reCAPTCHA or similar
   - Prevents bot submissions

3. **Email Verification**
   - Send verification email to reporter
   - Confirm submission is legitimate

4. **File Validation**
   - Server-side file type checking
   - Virus/malware scanning
   - Size limit enforcement

5. **Input Sanitization**
   - Sanitize all text inputs
   - Prevent XSS attacks
   - Validate email format

6. **CORS Configuration**
   - Allow only your domain
   - Restrict API access

## 📈 Monitoring Submissions

Submissions will appear in:
- **Error Reports Module** - For error reports
- **Feature Requests Module** - For feature/bug fix requests

Look for the "reporter" role to identify public submissions.

## 🆘 Support

### For Users
If the form doesn't work:
1. Try refreshing the page
2. Clear browser cache
3. Try a different browser
4. Contact IT directly

### For Administrators
Check the browser console for errors:
1. Right-click → Inspect
2. Go to Console tab
3. Look for error messages

## 📚 Additional Resources

- Full guide: `/PUBLIC_FORM_GUIDE.md`
- Backend specs: `/docs/Backend_Specifications.md`
- Guidelines: `/guidelines/Guidelines.md`

---

**Need Help?** Check the detailed guide in `PUBLIC_FORM_GUIDE.md` or review the component code in `/components/PublicSubmissionForm.tsx`.

**Last Updated**: April 10, 2026
