# Public Submission Form - User Guide

## Overview
The IT Ticketing System now includes a **Public Submission Form** that allows users to submit error reports and feature requests without needing to log into the admin dashboard.

## Accessing the Public Form

### Direct URL
Users can access the public form directly via:
```
https://your-domain.com/public/submit
```

### Shareable Link
Share this link with users who need to report issues or request features:
- Email it to department heads
- Post it on company intranet
- Add it to employee handbooks
- Create a QR code for easy mobile access

## Features

### Two Submission Types

1. **Error Report**
   - For reporting system errors, bugs, or technical issues
   - Includes fields for error category (Hardware/Network/Software)
   - Options to describe error location and steps to reproduce
   - Impact assessment field

2. **Feature Request / Bug Fix**
   - For requesting new features or bug fixes
   - Includes business justification field
   - Expected outcome description
   - Number of affected users/departments

### Form Fields

#### Required Information
- **Submission Type**: Error Report or Feature Request
- **Your Information**:
  - Full Name
  - Email Address
  - Department/Unit
- **Issue Details**:
  - Title/Summary
  - Detailed Description
  - Priority Level (Low/Medium/High/Critical)

#### Optional Information
- Phone Number
- File Attachments (up to 10MB total)
- Additional context fields based on submission type

### File Attachments
Users can upload supporting files:
- Screenshots
- Documents (PDF, DOC, DOCX)
- Spreadsheets (XLS, XLSX)
- Images (PNG, JPG)
- Text files
- **Maximum total size**: 10MB

## User Experience

### Simple 3-Step Process
1. **Select Type**: Choose between Error Report or Feature Request
2. **Fill Details**: Complete the form with issue information
3. **Submit**: Receive instant confirmation with reference number

### After Submission
Users receive:
- ✅ Instant confirmation message
- 📧 Reference number for tracking
- ⏱️ Expected response time (24-48 hours)
- 📬 Email notification when IT team reviews their submission

### Mobile Friendly
The form is fully responsive and works perfectly on:
- Desktop computers
- Tablets
- Smartphones

## Implementation Guide

### For IT Administrators

#### Sharing the Link
1. **Via Email Template**:
```
Subject: IT Support - Submit Issues and Requests

Dear Team,

You can now submit IT support requests and report issues using our new online form:
🔗 https://your-domain.com/public/submit

No login required! Simply fill out the form and our IT team will respond within 24-48 hours.

Best regards,
IT Support Team
```

2. **Intranet Portal**: Add a prominent button/link on your company intranet
3. **Email Signature**: IT staff can add the link to their email signatures
4. **QR Code**: Generate a QR code that links to the form for easy mobile access

#### Customization Options
You can customize the following in `/components/PublicSubmissionForm.tsx`:
- Company branding and colors
- Contact information in the footer
- Priority level descriptions
- Category options
- Maximum file upload size
- Form validation rules

#### Backend Integration
When ready to connect to your backend:
1. Update the `handleSubmit` function in `PublicSubmissionForm.tsx`
2. Replace the mock submission with actual API call
3. Configure email notifications
4. Set up ticket ID generation
5. Implement file upload to your storage service

Example API integration:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const formDataToSend = new FormData();
    
    // Add form fields
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
      toast.success(`Ticket created: ${result.ticketId}`);
      setSubmitted(true);
    }
  } catch (error) {
    toast.error('Failed to submit. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

## Benefits

### For Users
- ✅ No login required - quick and easy access
- ✅ Clean, intuitive interface like Google Forms
- ✅ Mobile-friendly for on-the-go submissions
- ✅ File upload support for screenshots and documents
- ✅ Instant confirmation with reference number

### For IT Team
- ✅ Standardized issue reporting format
- ✅ All necessary information captured upfront
- ✅ Automatic categorization and priority assignment
- ✅ Reduces back-and-forth for missing information
- ✅ Better tracking and analytics

### For Organization
- ✅ Improved response times
- ✅ Better documentation of issues
- ✅ Reduced support email volume
- ✅ Enhanced user satisfaction
- ✅ Data-driven insights into IT needs

## Security Considerations

### Current Implementation (Development)
- Form is publicly accessible without authentication
- Submissions are logged to console (mock mode)
- No sensitive data is stored

### Production Recommendations
1. **Rate Limiting**: Implement rate limiting to prevent spam
2. **CAPTCHA**: Add reCAPTCHA or similar to prevent bot submissions
3. **File Validation**: Server-side file type and size validation
4. **Email Verification**: Send verification email to reporter's address
5. **Input Sanitization**: Sanitize all user inputs to prevent XSS attacks
6. **Virus Scanning**: Scan uploaded files for malware
7. **Data Encryption**: Use HTTPS and encrypt data in transit
8. **Access Logs**: Log all submissions with IP addresses and timestamps

## Support and Troubleshooting

### Common Issues

**Q: Form won't submit**
- Check internet connection
- Ensure all required fields are filled
- Verify total file size is under 10MB

**Q: Can't upload files**
- Check file format is supported
- Ensure individual file isn't too large
- Try uploading fewer files at once

**Q: Didn't receive confirmation**
- Check spam/junk folder for email
- Note the reference number displayed on screen
- Contact IT directly if urgent

### Contact Information
For immediate assistance:
- 📧 Email: support@company.com
- 📞 Phone: Ext. 1234
- 🏢 Office: IT Department, Building A

## Future Enhancements

Planned improvements:
- [ ] Real-time status tracking via reference number
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] Voice-to-text for descriptions
- [ ] Integration with company Active Directory
- [ ] Automated ticket assignment rules
- [ ] AI-powered categorization
- [ ] Knowledge base integration

---

**Last Updated**: April 10, 2026
**Version**: 1.0
