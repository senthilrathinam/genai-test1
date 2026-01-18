# UI Redesign - Quick Start Guide

## What Was Changed

### ✅ Completed (Ready to Use)
1. **Layout & Navigation** - Modern navbar with gradient logo
2. **Dashboard** - Card-based design with stats and progress bars
3. **New Grant Form** - Drag-and-drop file upload
4. **Organization Profile** - Improved form with success notifications
5. **Component Library** - 5 reusable components created

### ⏳ Needs Manual Update
- **Grant Review Page** (`app/grants/[id]/page.tsx`) - See instructions below

## How to Use New Components

### Import Components
```tsx
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
```

### Quick Examples

**Button:**
```tsx
<Button variant="primary" loading={saving} icon={<SaveIcon />}>
  Save Changes
</Button>
```

**Badge:**
```tsx
<Badge variant="success" icon="✓">Completed</Badge>
```

**Card:**
```tsx
<Card hover className="p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

**Input:**
```tsx
<Input
  label="Name"
  required
  value={name}
  onChange={(e) => setName(e.target.value)}
  helperText="Enter your full name"
/>
```

## Updating Grant Review Page

The Grant Review page is complex and needs manual updates. Here's the minimal changes needed:

### 1. Add Imports
```tsx
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
```

### 2. Replace Action Buttons (Line ~150-200)
Find the action bar buttons and replace with:
```tsx
<Button 
  variant="primary" 
  loading={generating}
  onClick={handleGenerateDrafts}
  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>}
>
  Generate AI Answers
</Button>
```

### 3. Wrap Sidebar in Card (Line ~220)
```tsx
<Card className="sticky top-24">
  {/* Existing sidebar content */}
</Card>
```

### 4. Wrap Main Panel in Card (Line ~280)
```tsx
<Card className="p-6">
  {/* Existing question/answer content */}
</Card>
```

### 5. Update Status Badges (Line ~160)
```tsx
<Badge variant="warning" icon="⚠">Needs Input</Badge>
<Badge variant="info">Required</Badge>
```

## Testing Your Changes

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Check these pages:**
   - http://localhost:3000 (Dashboard)
   - http://localhost:3000/grants/new (New Grant)
   - http://localhost:3000/org (Organization Profile)
   - http://localhost:3000/grants/[id] (Grant Review - needs manual update)

3. **Test interactions:**
   - Click all buttons
   - Test file upload drag-and-drop
   - Fill out forms
   - Check hover effects
   - Verify loading states

## Color Reference

```
Primary:   bg-blue-600    (Buttons, links)
Success:   bg-emerald-600 (Success states)
Warning:   bg-amber-600   (Warnings)
Danger:    bg-red-600     (Delete, errors)
Secondary: bg-zinc-800    (Secondary buttons)

Backgrounds:
- bg-zinc-950 (Main)
- bg-zinc-900 (Cards)
- bg-zinc-800 (Borders)
```

## Common Patterns

### Page Header
```tsx
<div className="mb-8">
  <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
    <Link href="/">Dashboard</Link>
    <span>/</span>
    <span className="text-white">Current Page</span>
  </nav>
  <h1 className="text-3xl font-bold text-white mb-2">Page Title</h1>
  <p className="text-zinc-400 text-lg">Page description</p>
</div>
```

### Form Section
```tsx
<Card className="p-8">
  <div className="space-y-5">
    <Input label="Field 1" />
    <Input label="Field 2" />
    <Button variant="primary" size="lg" className="w-full">
      Submit
    </Button>
  </div>
</Card>
```

### Loading State
```tsx
<Button loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

## Need Help?

- Check `UI_REDESIGN_COMPLETE.md` for full documentation
- Look at existing pages for examples
- Component props are TypeScript typed - your IDE will help!

## Quick Wins

If you want to see immediate improvements without updating Grant Review page:

1. ✅ Dashboard looks amazing
2. ✅ New Grant form has drag-and-drop
3. ✅ Organization Profile is polished
4. ✅ Navigation is modern

The Grant Review page still works - it just doesn't use the new components yet. Update it when you have time!
