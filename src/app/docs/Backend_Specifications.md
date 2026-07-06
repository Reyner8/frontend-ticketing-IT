# IT Ticketing & Downtime Management System - Backend Specifications

## Table of Contents
1. [Data Transfer Objects (DTOs)](#data-transfer-objects-dtos)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [Validation Rules](#validation-rules)
5. [Error Handling](#error-handling)

## Data Transfer Objects (DTOs)

### 1. ErrorReportDTO

**Purpose**: Represents error reports from internal units (hardware, network, software teams)

**Fields**:
```typescript
interface ErrorReportDTO {
  id: string;                    // Primary key (e.g., "ERR-2024-001")
  title: string;                 // Required, max 200 chars
  description: string;           // Required, max 5000 chars
  category: "hardware" | "network" | "software"; // Required
  priority: "low" | "medium" | "high" | "critical"; // Required
  status: "pending_approval" | "in_progress" | "completed" | "overdue"; // Required
  reporterId: string;            // Required, FK to users
  assignedToId?: string;         // Optional, FK to users
  assignedTeam?: "programmer" | "network" | "hardware"; // Optional
  dateReported: Date;            // Required, auto-generated
  startDate?: Date;              // Optional, when work begins
  dueDate?: Date;                // Optional, deadline
  completionDate?: Date;         // Optional, when completed
  estimatedEffort?: number;      // Optional, hours
  actualEffort?: number;         // Optional, hours
  attachmentIds: string[];       // Array of attachment IDs
  tags: string[];               // Array of tags
  slaTimeElapsed: number;       // Calculated, hours since creation
  slaTimeRemaining: number;     // Calculated, hours until deadline
  slaBreached: boolean;         // Calculated flag
  statusHistory: StatusHistoryEntryDTO[]; // Status change history
  activityLog: ActivityLogEntryDTO[];     // All activities
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-updated
}
```

**Example JSON**:
```json
{
  "id": "ERR-2024-001",
  "title": "Database Connection Timeout",
  "description": "Multiple users experiencing timeout errors when accessing customer database.",
  "category": "software",
  "priority": "high",
  "status": "in_progress",
  "reporterId": "user_123",
  "assignedToId": "user_456",
  "assignedTeam": "programmer",
  "dateReported": "2024-12-20T09:15:00Z",
  "startDate": "2024-12-20T11:00:00Z",
  "dueDate": "2024-12-21T17:00:00Z",
  "estimatedEffort": 6,
  "actualEffort": 4.5,
  "attachmentIds": ["att_001"],
  "tags": ["database", "timeout", "performance"],
  "slaTimeElapsed": 32.5,
  "slaTimeRemaining": 8.5,
  "slaBreached": false,
  "statusHistory": [],
  "activityLog": [],
  "createdAt": "2024-12-20T09:15:00Z",
  "updatedAt": "2024-12-20T14:30:00Z"
}
```

### 2. FeatureRequestDTO

**Purpose**: Represents feature requests and bug fixes with detailed lifecycle tracking

**Fields**:
```typescript
interface FeatureRequestDTO {
  id: string;                    // Primary key (e.g., "FR-2024-001")
  title: string;                 // Required, max 200 chars
  description: string;           // Required, max 5000 chars
  requestType: "feature_request" | "bug_fix"; // Required
  priority: "low" | "medium" | "high" | "critical"; // Required
  status: "submission" | "pending_approval" | "approved" | "assigned" | 
          "development" | "testing" | "validation" | "completed" | 
          "post_implementation_review" | "rejected" | "cancelled"; // Required
  progress: number;              // 0-100 percentage
  reporterId: string;            // Required, FK to users
  assignedToId?: string;         // Optional, FK to users
  assignedTeam?: "programmer" | "network" | "hardware"; // Optional
  dateSubmitted: Date;           // Required, auto-generated
  approvalDate?: Date;           // When approved
  assignmentDate?: Date;         // When assigned
  startDate?: Date;              // When development starts
  dueDate?: Date;                // Target completion
  completionDate?: Date;         // When completed
  reviewDate?: Date;             // Post-implementation review
  estimatedEffort?: number;      // Hours
  actualEffort?: number;         // Hours
  attachmentIds: string[];       // Array of attachment IDs
  tags: string[];               // Array of tags
  milestones: MilestoneDTO[];    // Project milestones
  timeline: TimelineEntryDTO[];  // Lifecycle phases
  slaTimeElapsed: number;        // Hours since creation
  slaTimeRemaining: number;      // Hours until deadline
  slaBreached: boolean;          // SLA status flag
  statusHistory: StatusHistoryEntryDTO[]; // Status changes
  activityLog: ActivityLogEntryDTO[];     // All activities
  approvedBy?: string;           // User who approved
  rejectionReason?: string;      // If rejected
  roiImpact?: string;            // ROI notes
  qualityImpact?: string;        // Quality impact notes
  postImplementationNotes?: string; // Review notes
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-updated
}
```

**Example JSON**:
```json
{
  "id": "FR-2024-001",
  "title": "Two-Factor Authentication Implementation",
  "description": "Implement 2FA for enhanced security across all user accounts.",
  "requestType": "feature_request",
  "priority": "high",
  "status": "development",
  "progress": 65,
  "reporterId": "user_123",
  "assignedToId": "user_789",
  "assignedTeam": "programmer",
  "dateSubmitted": "2024-12-15T10:00:00Z",
  "approvalDate": "2024-12-16T09:30:00Z",
  "startDate": "2024-12-17T09:00:00Z",
  "dueDate": "2024-12-30T17:00:00Z",
  "estimatedEffort": 40,
  "actualEffort": 26,
  "attachmentIds": [],
  "tags": ["security", "2fa", "authentication"],
  "milestones": [],
  "timeline": [],
  "slaTimeElapsed": 144,
  "slaTimeRemaining": 216,
  "slaBreached": false,
  "statusHistory": [],
  "activityLog": [],
  "approvedBy": "user_admin",
  "createdAt": "2024-12-15T10:00:00Z",
  "updatedAt": "2024-12-20T16:30:00Z"
}
```

### 3. Supporting DTOs

**StatusHistoryEntryDTO**:
```typescript
interface StatusHistoryEntryDTO {
  id: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;           // User ID
  changedAt: Date;
  reason?: string;
  notes?: string;
}
```

**ActivityLogEntryDTO**:
```typescript
interface ActivityLogEntryDTO {
  id: string;
  action: "created" | "updated" | "assigned" | "commented" | 
          "status_changed" | "attachment_added" | "milestone_reached";
  description: string;
  performedBy: string;         // User ID
  performedAt: Date;
  details?: Record<string, any>; // JSON metadata
  targetUserId?: string;       // For mentions
}
```

**MilestoneDTO**:
```typescript
interface MilestoneDTO {
  id: string;
  title: string;
  description?: string;
  targetDate: Date;
  completedDate?: Date;
  isCompleted: boolean;
  progress: number;            // 0-100 percentage
  createdBy: string;          // User ID
  createdAt: Date;
}
```

**TimelineEntryDTO**:
```typescript
interface TimelineEntryDTO {
  id: string;
  phase: "submission" | "approval" | "assignment" | "development" | 
         "testing" | "validation" | "completion" | "review";
  title: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  isCompleted: boolean;
  progress: number;           // 0-100 percentage
  assignedTo?: string;        // User ID
  notes?: string;
}
```

**UserDTO**:
```typescript
interface UserDTO {
  id: string;
  email: string;              // Unique, required
  name: string;               // Required
  role: "admin" | "team_lead" | "it_staff" | "reporter"; // Required
  team?: "programmer" | "network" | "hardware"; // Optional
  isActive: boolean;
  preferences: UserPreferencesDTO;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**CommentDTO**:
```typescript
interface CommentDTO {
  id: string;
  ticketId: string;           // Can reference ErrorReport or FeatureRequest
  userId: string;
  content: string;
  isInternal: boolean;        // Internal vs user-visible
  attachmentIds: string[];
  mentions: string[];         // User IDs mentioned
  createdAt: Date;
  updatedAt?: Date;
}
```

**AttachmentDTO**:
```typescript
interface AttachmentDTO {
  id: string;
  filename: string;
  contentType: string;        // MIME type
  size: number;              // Bytes
  url: string;               // Storage URL
  uploadedBy: string;        // User ID
  ticketId?: string;         // Associated ticket
  commentId?: string;        // Associated comment
  createdAt: Date;
}
```

## API Endpoints

### Error Reports API

**Base URL**: `/api/error-reports`

#### List Error Reports
```http
GET /api/error-reports
```

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `category` (string): Filter by category
- `assignedTeam` (string): Filter by team
- `assignedTo` (string): Filter by user
- `reportedBy` (string): Filter by reporter
- `search` (string): Search in title/description
- `tags` (string): Comma-separated tags
- `slaStatus` (string): "compliant" | "breached" | "at_risk"
- `dateFrom` (ISO date): Filter from date
- `dateTo` (ISO date): Filter to date
- `sortBy` (string): Sort field
- `sortOrder` (string): "asc" | "desc"

**Response**:
```json
{
  "data": [ErrorReportDTO],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "filters": {
    "appliedFilters": {},
    "availableFilters": {}
  }
}
```

#### Create Error Report
```http
POST /api/error-reports
```

**Request Body**:
```json
{
  "title": "Database Connection Issue",
  "description": "Detailed description...",
  "category": "software",
  "priority": "high",
  "estimatedEffort": 6,
  "tags": ["database", "urgent"],
  "attachmentIds": ["att_001"]
}
```

**Response**: `201 Created` with ErrorReportDTO

#### Get Error Report
```http
GET /api/error-reports/{id}
```

**Response**: ErrorReportDTO with full details including statusHistory and activityLog

#### Update Error Report
```http
PUT /api/error-reports/{id}
```

**Request Body**: Partial ErrorReportDTO fields

#### Update Error Report Status
```http
PATCH /api/error-reports/{id}/status
```

**Request Body**:
```json
{
  "status": "in_progress",
  "reason": "Starting investigation",
  "notes": "Assigned to development team",
  "assignedToId": "user_456"
}
```

#### Assign Error Report
```http
PATCH /api/error-reports/{id}/assign
```

**Request Body**:
```json
{
  "assignedToId": "user_456",
  "assignedTeam": "programmer",
  "dueDate": "2024-12-21T17:00:00Z",
  "estimatedEffort": 8
}
```

#### Add Comment
```http
POST /api/error-reports/{id}/comments
```

**Request Body**:
```json
{
  "content": "Working on this issue now",
  "isInternal": false,
  "mentions": ["user_123"],
  "attachmentIds": ["att_002"]
}
```

#### Add Attachment
```http
POST /api/error-reports/{id}/attachments
```

**Request**: Multipart form data with file upload

### Feature Requests API

**Base URL**: `/api/feature-requests`

#### List Feature Requests
```http
GET /api/feature-requests
```

**Query Parameters**: Similar to error reports plus:
- `requestType`: "feature_request" | "bug_fix"
- `progress`: Filter by progress range
- `approvedBy`: Filter by approver

#### Create Feature Request
```http
POST /api/feature-requests
```

**Request Body**:
```json
{
  "title": "Two-Factor Authentication",
  "description": "Implement 2FA security...",
  "requestType": "feature_request",
  "priority": "high",
  "estimatedEffort": 40,
  "tags": ["security", "authentication"]
}
```

#### Approve/Reject Feature Request
```http
PATCH /api/feature-requests/{id}/approval
```

**Request Body**:
```json
{
  "action": "approve",  // or "reject"
  "reason": "Approved for security enhancement",
  "approvedBy": "user_admin",
  "dueDate": "2024-12-30T17:00:00Z"
}
```

#### Update Progress
```http
PATCH /api/feature-requests/{id}/progress
```

**Request Body**:
```json
{
  "progress": 65,
  "notes": "SMS integration completed",
  "actualEffort": 26
}
```

#### Add Milestone
```http
POST /api/feature-requests/{id}/milestones
```

**Request Body**:
```json
{
  "title": "SMS Integration Complete",
  "description": "SMS-based 2FA functionality",
  "targetDate": "2024-12-22T17:00:00Z"
}
```

#### Update Milestone
```http
PATCH /api/feature-requests/{id}/milestones/{milestoneId}
```

**Request Body**:
```json
{
  "isCompleted": true,
  "completedDate": "2024-12-20T16:30:00Z",
  "progress": 100
}
```

### Common Endpoints

#### Get Current User
```http
GET /api/auth/me
```

#### Get Users (for assignments)
```http
GET /api/users
```

**Query Parameters**:
- `role`: Filter by role
- `team`: Filter by team
- `active`: Filter active users

#### Get Attachments
```http
GET /api/attachments/{id}
```

#### Upload Attachment
```http
POST /api/attachments
```

#### Dashboard Statistics
```http
GET /api/dashboard/stats
```

**Response**:
```json
{
  "errorReports": {
    "total": 45,
    "pending": 12,
    "inProgress": 8,
    "completed": 23,
    "overdue": 2,
    "slaBreached": 3
  },
  "featureRequests": {
    "total": 28,
    "pending": 5,
    "approved": 15,
    "inDevelopment": 6,
    "completed": 12,
    "rejected": 2
  },
  "teamWorkload": {
    "programmer": { "workload": 75, "tickets": 18 },
    "network": { "workload": 60, "tickets": 12 },
    "hardware": { "workload": 85, "tickets": 15 }
  }
}
```

## Database Schema

### Tables

#### error_reports
```sql
CREATE TABLE error_reports (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('hardware', 'network', 'software') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  status ENUM('pending_approval', 'in_progress', 'completed', 'overdue') NOT NULL,
  reporter_id VARCHAR(50) NOT NULL,
  assigned_to_id VARCHAR(50) NULL,
  assigned_team ENUM('programmer', 'network', 'hardware') NULL,
  date_reported TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMP NULL,
  due_date TIMESTAMP NULL,
  completion_date TIMESTAMP NULL,
  estimated_effort DECIMAL(5,2) NULL,
  actual_effort DECIMAL(5,2) NULL,
  tags JSON NULL,
  sla_time_elapsed DECIMAL(8,2) NOT NULL DEFAULT 0,
  sla_time_remaining DECIMAL(8,2) NOT NULL DEFAULT 0,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_category (category),
  INDEX idx_assigned_team (assigned_team),
  INDEX idx_date_reported (date_reported),
  INDEX idx_sla_breached (sla_breached)
);
```

#### feature_requests
```sql
CREATE TABLE feature_requests (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  request_type ENUM('feature_request', 'bug_fix') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  status ENUM('submission', 'pending_approval', 'approved', 'assigned', 
              'development', 'testing', 'validation', 'completed', 
              'post_implementation_review', 'rejected', 'cancelled') NOT NULL,
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  reporter_id VARCHAR(50) NOT NULL,
  assigned_to_id VARCHAR(50) NULL,
  assigned_team ENUM('programmer', 'network', 'hardware') NULL,
  date_submitted TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approval_date TIMESTAMP NULL,
  assignment_date TIMESTAMP NULL,
  start_date TIMESTAMP NULL,
  due_date TIMESTAMP NULL,
  completion_date TIMESTAMP NULL,
  review_date TIMESTAMP NULL,
  estimated_effort DECIMAL(5,2) NULL,
  actual_effort DECIMAL(5,2) NULL,
  tags JSON NULL,
  sla_time_elapsed DECIMAL(8,2) NOT NULL DEFAULT 0,
  sla_time_remaining DECIMAL(8,2) NOT NULL DEFAULT 0,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by VARCHAR(50) NULL,
  rejection_reason TEXT NULL,
  roi_impact TEXT NULL,
  quality_impact TEXT NULL,
  post_implementation_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_request_type (request_type),
  INDEX idx_priority (priority),
  INDEX idx_progress (progress),
  INDEX idx_date_submitted (date_submitted)
);
```

#### users
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'team_lead', 'it_staff', 'reporter') NOT NULL,
  team ENUM('programmer', 'network', 'hardware') NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  preferences JSON NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_role (role),
  INDEX idx_team (team),
  INDEX idx_active (is_active)
);
```

#### status_history
```sql
CREATE TABLE status_history (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL,
  ticket_type ENUM('error_report', 'feature_request') NOT NULL,
  previous_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NULL,
  notes TEXT NULL,
  
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_ticket_type (ticket_type),
  INDEX idx_changed_at (changed_at)
);
```

#### activity_log
```sql
CREATE TABLE activity_log (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL,
  ticket_type ENUM('error_report', 'feature_request') NOT NULL,
  action ENUM('created', 'updated', 'assigned', 'commented', 
              'status_changed', 'attachment_added', 'milestone_reached') NOT NULL,
  description TEXT NOT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSON NULL,
  target_user_id VARCHAR(50) NULL,
  
  FOREIGN KEY (performed_by) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_action (action),
  INDEX idx_performed_at (performed_at)
);
```

#### comments
```sql
CREATE TABLE comments (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL,
  ticket_type ENUM('error_report', 'feature_request') NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  mentions JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_created_at (created_at)
);
```

#### attachments
```sql
CREATE TABLE attachments (
  id VARCHAR(50) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  storage_url TEXT NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  ticket_id VARCHAR(50) NULL,
  comment_id VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (comment_id) REFERENCES comments(id),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_comment_id (comment_id),
  INDEX idx_uploaded_by (uploaded_by)
);
```

#### milestones
```sql
CREATE TABLE milestones (
  id VARCHAR(50) PRIMARY KEY,
  feature_request_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  target_date TIMESTAMP NOT NULL,
  completed_date TIMESTAMP NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (feature_request_id) REFERENCES feature_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_feature_request_id (feature_request_id),
  INDEX idx_target_date (target_date)
);
```

#### timeline_entries
```sql
CREATE TABLE timeline_entries (
  id VARCHAR(50) PRIMARY KEY,
  feature_request_id VARCHAR(50) NOT NULL,
  phase ENUM('submission', 'approval', 'assignment', 'development', 
             'testing', 'validation', 'completion', 'review') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  assigned_to VARCHAR(50) NULL,
  notes TEXT NULL,
  
  FOREIGN KEY (feature_request_id) REFERENCES feature_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  INDEX idx_feature_request_id (feature_request_id),
  INDEX idx_phase (phase)
);
```

## Validation Rules

### Error Reports
1. **Title**: Required, 1-200 characters
2. **Description**: Required, 1-5000 characters
3. **Category**: Must be one of: hardware, network, software
4. **Priority**: Must be one of: low, medium, high, critical
5. **Status**: Must follow valid transitions:
   - pending_approval → in_progress
   - in_progress → completed
   - Any status → overdue (system can set)
6. **Dates**: 
   - startDate must be >= dateReported
   - dueDate must be > dateReported
   - completionDate must be >= startDate
7. **Effort**: Must be positive numbers
8. **Assignment**: assignedTeam should match category when possible
9. **SLA**: Auto-calculated based on priority and timestamps

### Feature Requests
1. **Title**: Required, 1-200 characters
2. **Description**: Required, 1-5000 characters
3. **Request Type**: Must be feature_request or bug_fix
4. **Priority**: Must be one of: low, medium, high, critical
5. **Status**: Must follow lifecycle:
   - submission → pending_approval → approved → assigned → development → testing → validation → completed → post_implementation_review
   - Any status can go to rejected or cancelled
6. **Progress**: Must be 0-100
7. **Dates**: Must follow logical sequence
8. **Approval**: Only admin/team_lead can approve
9. **Milestones**: targetDate must be <= featureRequest.dueDate

### Business Rules
1. **SLA Thresholds**:
   - Critical: 4 hours
   - High: 24 hours
   - Medium: 72 hours
   - Low: 168 hours

2. **Auto-assignment Rules**:
   - Hardware category → hardware team
   - Network category → network team
   - Software category → programmer team

3. **Role Permissions**:
   - **Admin**: Full access to everything
   - **Team Lead**: Can approve, assign within team, view team reports
   - **IT Staff**: Can update assigned tickets, view assigned work
   - **Reporter**: Can create reports, view own reports

4. **Status Transitions**:
   - Only assigned users can change status to in_progress
   - Only admins/team_leads can mark as completed
   - System automatically marks as overdue based on SLA

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful GET/PUT/PATCH
- `201 Created`: Successful POST
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Business logic conflicts
- `429 Too Many Requests`: Rate limiting
- `500 Internal Server Error`: Server errors

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "code": "REQUIRED"
      },
      {
        "field": "dueDate",
        "message": "Due date must be in the future",
        "code": "INVALID_DATE"
      }
    ]
  },
  "timestamp": "2024-12-21T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Unique constraint violation
- `INVALID_STATUS_TRANSITION`: Invalid status change
- `SLA_VIOLATION`: Action would violate SLA
- `BUSINESS_RULE_VIOLATION`: Violates business logic
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

This specification provides a complete backend contract for implementing the Error Reports and Feature Requests modules with proper data validation, API design, and database structure.