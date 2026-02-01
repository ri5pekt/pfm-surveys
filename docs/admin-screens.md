# Admin Dashboard - Screen Requirements

This document outlines the screens and features required for the Survey Platform admin dashboard.

## Overview

The admin dashboard is built with Vue 3, Pinia, and PrimeVue. It provides a complete interface for managing tenants, sites, surveys, and viewing analytics.

**📸 Visual Reference:** See [SCREENSHOTS.md](./SCREENSHOTS.md) for detailed screenshots of the surveys list, results screen, and survey editor.

## Authentication Screens

### 1. Login Screen

**Purpose:** Authenticate users to access the admin dashboard

**Features:**
- Email/username input field
- Password input field with show/hide toggle
- "Remember me" checkbox (optional)
- "Forgot password?" link (future phase)
- Login button with loading state
- Error messages for invalid credentials
- JWT token storage on successful login

**Validation:**
- Required field validation
- Email format validation
- Rate limiting feedback

**Navigation:**
- On success: Redirect to dashboard/surveys list
- On failure: Show error message, clear password field

---

## Main Navigation

The dashboard should include a sidebar or top navigation with:
- Dashboard/Home
- Sites
- Surveys
- Analytics (future)
- Settings
- User profile dropdown
- Logout

---

## Site Management Screens

### 2. Sites List Screen

**Purpose:** View and manage all websites/sites for the current tenant

**Features:**
- Table/list view of all sites
- Columns:
  - Site name
  - Domain(s)
  - Site ID (public identifier)
  - Status (active/inactive)
  - Created date
  - Actions menu
- Search/filter by site name or domain
- "Add new site" button
- Pagination for large lists
- Actions dropdown per site:
  - Edit site
  - View surveys
  - View users/team (if applicable)
  - Copy embed code
  - Deactivate/Delete

**Empty State:**
- Message: "No sites yet"
- Call to action: "Add your first site" button

### 3. Add/Edit Site Screen

**Purpose:** Create or modify a site configuration

**Features:**
- Site name (required)
- Allowed domains list (optional, for security)
  - Add domain button
  - Remove domain button
  - Format: example.com, *.example.com
- Site secret (auto-generated, show/hide)
- Copy site secret button
- Status toggle (active/inactive)
- Save and Cancel buttons

**Embed Code Section:**
- Display the embed script snippet
- Copy to clipboard button
- Instructions for implementation

**Example Embed Code:**
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://surveys.yourdomain.com/embed.js?site_id=SITE_ID';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

**Validation:**
- Site name required
- Domain format validation
- Unique site name per tenant

### 4. Site Users/Team Screen (Future Phase)

**Purpose:** Manage users who have access to a specific site

**Features:**
- List of users with access to the site
- User email, role, and permissions
- Add user button
- Remove user action
- Role assignment (Admin, Editor, Viewer)

---

## Survey Management Screens

### 5. Surveys List Screen

**Purpose:** View and manage all surveys for the selected site

**Reference:** See screenshot 1 (surveys list with active/inactive tabs)

**Features:**
- Site selector dropdown (if managing multiple sites)
- Search bar: "Filter by Survey name or creator"
- Tabs:
  - Active surveys (with count badge)
  - Inactive surveys (with count badge)
- Table columns:
  - Status indicator (checkmark icon)
  - Survey name (clickable link)
  - Responses count
  - Created by (user name)
  - Date created
  - Type (Popover, Embedded, etc.)
  - Actions dropdown
- Actions dropdown per survey:
  - View results
  - View responses
  - Export to CSV
  - Export to XLSX
  - Edit
  - Duplicate
  - Delete
- "Create new survey" button
- Bulk actions (select multiple surveys)
- Sorting by column headers

**Empty State:**
- Message: "No surveys created yet"
- Call to action: "Create your first survey" button

**Real-time updates:**
- Response counts should update automatically or with manual refresh

### 6. Survey Results Screen

**Purpose:** View aggregated analytics and individual responses for a survey

**Reference:** See screenshot 2 (survey results with bar charts and response list)

**Layout:**

**Header Section:**
- Survey question displayed prominently
- Total answer count
- Date range selector (optional)
- Export buttons (CSV, XLSX)
- Back to surveys list link

**Summary Section:**
- Top answer highlighted (percentage and label)
- Visual representation (large percentage)

**Chart Section:**
- Horizontal bar chart showing all answer options
- Each bar shows:
  - Answer text
  - Percentage
  - Visual bar (proportional length)
  - Answer count on the right
- Bars sorted by answer count (descending)
- Different color for each answer option
- "See more answers" expand/collapse if many options

**Individual Responses Table:**
- Columns:
  - # (response number)
  - Answer text
  - Tags (optional, for categorization)
  - Page (URL where survey was answered, with external link icon)
  - Date/time
  - Actions (View response, More options menu)
- "View response" button per row
- Pagination
- Bulk delete option (trash icon)

**Filters:**
- Filter by answer option
- Filter by date range
- Filter by page/URL
- Search responses

### 7. Survey Edit/Create Screen

**Purpose:** Build and configure surveys with questions, targeting, and display settings

**Reference:** See screenshot 3 (survey editor with questions and preview)

**Layout:** Two-panel design

**Left Panel - Survey Builder:**

**Details Section (collapsible):**
- Survey name/title input
- Survey type selector (Popover, etc.)
- Status toggle (active/inactive)

**Questions Section (collapsible, expanded by default):**
- "Add question" button with AI option
- "More options" dropdown menu
- Question counter display
- Refresh/sync button
- Desktop/mobile preview toggle

**Question Editor:**
- Question number indicator
- Question type selector:
  - Radio buttons (single choice)
  - Checkboxes (multiple choice)
  - Text input
  - Rating scale (future)
- Question text input (rich text)
- "Add image" button
- Image upload (up to 2MB, JPG/PNG/GIF/WebP)
- Category/tag selector (e.g., "BUSINESS")
- Required toggle
- Answer options list:
  - Text input per answer
  - Add comment/note icon per answer
  - Delete answer button
  - Drag handles for reordering (future)
- "Add answer" button
- Delete question button

**Targeting Section (collapsible):**
- URL targeting rules
  - Match type: Contains, Exact, Starts with, Regex
  - URL pattern input
  - Add multiple rules
- Device targeting (Desktop, Mobile, Tablet)
- Visitor targeting (New, Returning)
- Time on page trigger (seconds)
- Scroll depth trigger (percentage)
- Exit intent trigger (future)

**Display Settings Section (collapsible):**
- Position (bottom-left, bottom-right, center, etc.)
- Theme/colors customization
- Show delay (milliseconds)
- Auto-close after X seconds (optional)
- Display frequency:
  - Show once per session
  - Show once per user (localStorage)
  - Show every visit
  - Show after X days

**Sampling Section (collapsible):**
- Sample rate percentage (0-100%)
- Max responses cap (optional)

**Right Panel - Live Preview:**
- Real-time preview of survey appearance
- Shows survey as it will appear on website
- Preview background (simulated webpage)
- Toggle between desktop/mobile views
- Interactive (can click through questions)

**Action Buttons:**
- Save draft
- Preview on live site
- Publish/Activate
- Cancel

**Validation:**
- At least one question required
- Each question needs at least 2 answer options (for multiple choice)
- Question text required
- Answer text required

---

## Additional Screens (Future Phases)

### Dashboard/Home Screen
- Key metrics overview
- Recent surveys
- Response trends graph
- Quick actions

### Settings Screen
- Account settings
- Team management
- API keys
- Billing (if SaaS)
- Integrations

### Analytics Screen
- Cross-survey analytics
- Response trends over time
- Top-performing surveys
- Conversion funnel (future)

---

## Design System

### Components (PrimeVue)

**Tables:**
- DataTable with sorting, filtering, pagination
- Row selection for bulk actions
- Responsive design

**Forms:**
- InputText, Password, TextArea
- Dropdown, MultiSelect
- InputSwitch (toggles)
- Button with loading states

**Layout:**
- Sidebar navigation
- Breadcrumbs
- Card containers
- Panel (collapsible sections)

**Feedback:**
- Toast notifications for success/error messages
- Confirm dialog for destructive actions
- Loading spinners/skeletons

**Charts:**
- Chart.js or similar for bar/line charts
- Simple progress bars for percentages

### Color Scheme (Aura Theme)
- Primary: Blue/Purple (for actions, links)
- Success: Green (active status, success messages)
- Warning: Orange/Yellow (warnings)
- Danger: Red (delete, errors)
- Neutral: Grays (borders, backgrounds, text)

### Typography
- Headers: Bold, larger font
- Body text: Regular weight, readable size
- Labels: Smaller, uppercase or bold

### Spacing & Layout
- Consistent padding/margins (8px grid)
- Card-based layouts
- Responsive breakpoints (mobile, tablet, desktop)

---

## User Experience Principles

1. **Immediate Feedback:** Show loading states, success/error messages
2. **Confirmation for Destructive Actions:** Always confirm delete operations
3. **Autosave (Future):** Save drafts automatically while editing surveys
4. **Keyboard Shortcuts:** Support common shortcuts (Ctrl+S for save, etc.)
5. **Empty States:** Provide clear guidance when lists are empty
6. **Error Handling:** Display user-friendly error messages
7. **Responsive Design:** Work seamlessly on desktop, tablet, and mobile
8. **Performance:** Fast page loads, optimized queries, pagination for large datasets

---

## Technical Implementation Notes

### State Management (Pinia)
- `authStore` - User authentication state, login/logout
- `siteStore` - Sites list, current site, CRUD operations
- `surveyStore` - Surveys list, current survey, CRUD operations
- `resultsStore` - Survey results, responses, analytics

### API Endpoints Needed
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/sites
POST   /api/sites
GET    /api/sites/:id
PUT    /api/sites/:id
DELETE /api/sites/:id
GET    /api/sites/:id/surveys
GET    /api/surveys
POST   /api/surveys
GET    /api/surveys/:id
PUT    /api/surveys/:id
DELETE /api/surveys/:id
GET    /api/surveys/:id/results
GET    /api/surveys/:id/responses
GET    /api/surveys/:id/export?format=csv|xlsx
```

### Routing (Vue Router)
```
/login
/sites
/sites/new
/sites/:id/edit
/sites/:id/users
/surveys (default: current site's surveys)
/surveys/new
/surveys/:id/edit
/surveys/:id/results
/settings
/profile
```

### Permissions
- Role-based access control (if multi-user)
- Tenant isolation (users only see their tenant's data)
- Site-level permissions (future)

---

## Development Checklist

### Phase 1 - MVP Screens
- [ ] Login screen
- [ ] Sites list screen
- [ ] Add/edit site screen
- [ ] Surveys list screen (active/inactive tabs)
- [ ] Survey create/edit screen (question builder)
- [ ] Survey results screen (charts + response table)

### Phase 2 - Enhanced Features
- [ ] Dashboard/home screen with metrics
- [ ] Site users/team management
- [ ] Advanced filters on results
- [ ] Export functionality (CSV, XLSX)
- [ ] Bulk actions
- [ ] Settings screen

### Phase 3 - Advanced
- [ ] Multi-question surveys
- [ ] Question logic/branching
- [ ] A/B testing
- [ ] Advanced analytics
- [ ] Custom reports

---

## Screenshots Reference

The following screenshots show the desired UI for key screens:

1. **Surveys List Screen** - Shows active/inactive tabs, table with responses count, actions menu
2. **Survey Results Screen** - Bar chart visualization, top answer highlight, individual responses table
3. **Survey Edit Screen** - Two-panel layout with question builder and live preview

These serve as the design reference for implementation.
