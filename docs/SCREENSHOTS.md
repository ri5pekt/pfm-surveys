# Admin Dashboard - Visual Reference

This document links the provided screenshots to their corresponding screen specifications.

## Screenshot 1: Surveys List Screen

**File:** `image-7200b69b-5ad9-4145-84e2-30af45ecd772.png`

**Description:** The main surveys management screen showing:
- Search bar for filtering by survey name or creator
- Active (6) and Inactive (151) tabs
- Table with columns: Status, Name, Responses, Created by, Date created, Type, Actions
- Status indicator with checkmark icons for active surveys
- Response counts per survey
- Actions dropdown menu with options:
  - View results
  - View responses
  - Export to CSV
  - Export to XLSX
  - Edit
  - Duplicate
  - Delete

**Key Features Shown:**
- Multiple surveys with varying response counts (6, None, 42, 39, 8, 1)
- Creator attribution (Nicole Luvich, Denis)
- Date formatting (relative dates like "5 days ago", absolute dates like "1st January")
- Survey type indicator (Popover)
- Clickable survey names as links

---

## Screenshot 2: Survey Results Screen

**File:** `image-1b6b19a4-a97d-49c6-9fb9-ca7e47c9f1b0.png`

**Description:** Detailed results view for a single survey question showing:
- Question header: "If you've never purchased hand cream before, why? Select the main reason."
- Total answer count: 39 answers
- Top answer highlight: 36% - "I'm skeptical it makes a difference" (14 answers)
- Horizontal bar chart showing all answer options:
  - "I'm skeptical it makes a difference" - 36% (14 answers)
  - "I have purchased hand cream before" - 33% (13 answers)
  - "I've never really thought about it" - 13% (5 answers)
  - "I don't think I need it" - 8% (3 answers)
  - "I don't like the feeling (sticky/greasy)" - 5% (2 answers)
- "See more answers" expand button
- Individual responses table with columns:
  - # (response number)
  - Answer text
  - Tags (with tag icon)
  - Page (URL link with external link icon)
  - Date (timestamp format: Jan 31, 17:41)
  - Actions (View response button + more options menu)
- Bulk delete option (trash icon in header)

**Key Features Shown:**
- Clear visual hierarchy with percentages
- Color-coded bars for different answers
- Answer count displayed on the right of each bar
- Sortable/filterable response table
- URL tracking for each response
- Time-stamped responses

---

## Screenshot 3: Survey Edit Screen

**File:** `image-db046fc8-34f9-47ce-b4ed-fe8166aab5b4.png`

**Description:** Survey builder interface with two-panel layout:

**Left Panel - Survey Builder:**
- Collapsible sections: Details, Type, Questions (expanded)
- "Add question" button with AI option
- "More options" dropdown
- Question counter: "8 questions"
- Desktop/mobile preview toggle buttons
- Question editor showing:
  - Question type: Radio buttons
  - Required toggle (enabled)
  - Question text: "How did you first hear about Particle?"
  - "Add image" button
  - Image upload support (up to 2MB)
  - Category tag: "BUSINESS"
  - Answer options list:
    - TV ad
    - Social media ad
    - Outdoor billboard
    - Website banner
    - Searching on Google
  - Icons for adding comments and deleting answers
  - Delete question button

**Right Panel - Live Preview:**
- Dark background simulating a real website
- Survey popover displayed as it would appear to users
- Question shown: "What could we have done better to improve the info you received?"
- Text input field in the preview
- Realistic rendering of survey appearance

**Key Features Shown:**
- Drag-and-drop question builder
- Real-time preview updates
- Multiple question types support
- Image upload capability
- Category/tag system
- Clean, intuitive interface
- Required field enforcement

---

## Screen Coverage Summary

| Screen | Status | Screenshot | Documentation |
|--------|--------|------------|---------------|
| Login | ❌ Not shown | - | ✅ Specified in admin-screens.md |
| Sites List | ❌ Not shown | - | ✅ Specified in admin-screens.md |
| Add/Edit Site | ❌ Not shown | - | ✅ Specified in admin-screens.md |
| Site Users | ❌ Not shown | - | ✅ Specified in admin-screens.md |
| **Surveys List** | ✅ **Shown** | Screenshot 1 | ✅ Specified in admin-screens.md |
| **Survey Results** | ✅ **Shown** | Screenshot 2 | ✅ Specified in admin-screens.md |
| **Survey Edit** | ✅ **Shown** | Screenshot 3 | ✅ Specified in admin-screens.md |

---

## Design Patterns to Follow

Based on the screenshots, maintain these consistent patterns:

### Tables
- Clean, minimal design with subtle borders
- Hover states on rows
- Action buttons aligned right
- Status indicators using colored icons
- Consistent column spacing

### Forms
- Left-aligned labels
- Clear required field indicators
- Inline validation
- Toggle switches for boolean values
- Dropdown menus for actions

### Typography
- Sans-serif font (system font stack or similar)
- Clear hierarchy (larger headers, readable body text)
- Consistent spacing between sections

### Colors (from screenshots)
- Blue/purple for primary actions and active states
- Red for delete actions
- Various colors for chart bars
- Dark backgrounds for previews
- Light gray backgrounds for cards/panels

### Interactions
- Dropdown menus for multiple actions
- Inline editing where appropriate
- Confirmation dialogs for destructive actions
- Loading states for async operations

---

## Implementation Priority

1. **Login Screen** (no screenshot - implement standard login form)
2. **Sites List + Add Site** (no screenshot - use Surveys List as template)
3. **Surveys List** (Screenshot 1 - implement as shown)
4. **Survey Edit/Create** (Screenshot 3 - implement as shown)
5. **Survey Results** (Screenshot 2 - implement as shown)
6. **Site Users** (future phase)

---

## Notes for Developers

- The screenshots demonstrate a polished, production-ready UI
- Maintain consistency in spacing, colors, and interaction patterns
- Use PrimeVue components that match the visual style shown
- Ensure responsive design for all screen sizes
- Implement loading states and empty states not shown in screenshots
- Add error handling and validation as specified in admin-screens.md
