# Custom Organization Sections Implementation

## Summary
Added support for custom organization information sections that users can add, edit, and delete. These sections are included in AI prompts when generating draft answers.

## Changes Made

### 1. Data Model (`types/index.ts`)

Added new type:
```typescript
export interface OrgExtraSection {
  id: string;        // UUID
  title: string;     // e.g., "Key Impact Metrics"
  content: string;   // Longer text content
}
```

Updated `OrganizationProfile`:
```typescript
export interface OrganizationProfile {
  org_id: string;
  legal_name: string;
  mission_short: string;
  mission_long: string;
  address: string;
  extra_sections?: OrgExtraSection[];  // NEW
}
```

### 2. API Updates (`app/api/org-profile/route.ts`)

**GET /api/org-profile**:
- Returns `extra_sections: []` if not present (backward compatible)
- Ensures empty array instead of undefined

**PUT /api/org-profile**:
- Accepts and persists `extra_sections` array
- Uses existing DynamoDB client with `removeUndefinedValues`

### 3. UI Updates (`app/org/page.tsx`)

**New State Management**:
- `extra_sections` initialized as empty array
- Three new functions:
  - `addSection()` - Creates new section with UUID
  - `updateSection(id, field, value)` - Updates title or content
  - `deleteSection(id)` - Removes section

**New UI Card**: "Additional Organization Information"
- Appears below core fields card
- For each section:
  - Title input (single line)
  - Content textarea (4 rows)
  - Delete button (red, right-aligned)
- "Add Section" button at bottom
- Same "Save Changes" button saves everything

**Styling**:
- Consistent dark theme
- Border around each section
- Red delete button with hover effect
- Placeholder text for guidance

### 4. AI Integration (`lib/bedrock.ts`)

**Enhanced Prompt**:
```
Organization: [name]
Mission: [short]
Detailed Mission: [long]

Additional organization information:
• [Section Title 1]: [content truncated to 800 chars]
• [Section Title 2]: [content truncated to 800 chars]

Question: [question text]
Question Type: [type]
```

**Content Truncation**:
- Each section content limited to 800 characters
- Prevents excessively long prompts
- Adds "..." if truncated

## User Flow

1. **Navigate to /org**
2. **Fill core fields** (legal name, mission, address)
3. **Click "Add Section"**
4. **Enter section title** (e.g., "Key Impact Metrics")
5. **Enter section content** (detailed information)
6. **Repeat** for additional sections
7. **Click "Save Changes"** - saves all fields at once
8. **Generate draft answers** - AI uses all sections

## Example Use Cases

### Section: "Key Impact Metrics"
```
Content: "In 2024, we served 1,250 students across 15 schools. 
92% of participants showed improved STEM skills. 
85% of graduates pursued STEM careers."
```

### Section: "STEM Programs Overview"
```
Content: "Our flagship programs include:
- Robotics Club (ages 10-14)
- Coding Bootcamp (ages 15-18)
- Science Fair Mentorship
All programs are free and include materials."
```

### Section: "Community Partnerships"
```
Content: "We partner with 8 local schools, 3 tech companies, 
and 2 universities. Partners provide mentors, equipment, 
and internship opportunities."
```

## Technical Details

### ID Generation
- Uses `crypto.randomUUID()` for unique section IDs
- Browser-native, no external dependencies

### State Management
- Single state object for entire profile
- Immutable updates using spread operators
- Single save operation for all changes

### Backward Compatibility
- Existing profiles without `extra_sections` work fine
- API returns empty array if field missing
- No migration needed

### Content Limits
- No UI limit on content length
- AI prompt truncates to 800 chars per section
- Prevents token limit issues with Bedrock

## Benefits

1. **Flexible**: Users can add any custom information
2. **Organized**: Sections have clear titles
3. **AI-aware**: All sections included in prompts
4. **Simple**: Single save for all changes
5. **Scalable**: No limit on number of sections

## Future Enhancements (Not Implemented)

- Reorder sections (drag and drop)
- Section templates (common categories)
- Character count indicators
- Rich text formatting
- Section visibility toggles (include/exclude from AI)
