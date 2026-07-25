# Proflow AI - Clean Design System

This guide establishes the clean, cohesive aesthetic for all pages and tabs in the application, based on the Patient Details view.

## Design Principles

1. **Clarity** - Information hierarchy is clear and uncluttered
2. **Consistency** - Repeated patterns across all pages
3. **Compact** - Minimal whitespace, tighter layouts
4. **Purposeful** - Every element has a function

## Color Scheme

- **Primary** - Teal/Green (`bg-primary`, `text-primary`, `border-primary`)
- **Accent colors for categories:**
  - Allergies: `border-red-500/30 bg-red-500/5` with `text-red-600`
  - Conditions: `border-blue-500/30 bg-blue-500/5` with `text-blue-600`
  - Medications: `border-green-500/30 bg-green-500/5` with `text-green-600`
  - Symptoms: `border-amber-500/30 bg-amber-500/5` with `text-amber-600`

## Typography

- **Section Headers**: `text-sm font-semibold` (not text-lg or larger)
- **Body text**: `text-xs` or `text-sm` (compact)
- **Muted text**: `text-muted-foreground text-xs`
- **Status text**: `text-[11px]` for inline status badges

## Layout Components

### Section Frame
```tsx
<div className="rounded-xl border border-primary/40 bg-card p-5">
  <h4 className="text-sm font-semibold text-foreground">Section Title</h4>
  {/* Content */}
</div>
```

### Compact Section with Icon
```tsx
<div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
  <div className="flex items-center gap-2 mb-3">
    <IconComponent className="h-4 w-4 text-primary" />
    <h4 className="text-sm font-semibold text-foreground">Section Title</h4>
  </div>
  {/* Content */}
</div>
```

### Status Item (Conditions, Medications, Symptoms)
```tsx
<div className="text-xs flex items-center justify-between gap-2">
  <div className="flex items-start gap-2 flex-1 min-w-0">
    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${isActive ? 'bg-green-500' : 'bg-muted-foreground/60'}`} />
    <div className="min-w-0">
      <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground line-through"}>
        Item Name
      </span>
      <span className="text-muted-foreground ml-1 text-[11px]">(Date)</span>
    </div>
  </div>
  <Button variant="ghost" size="sm" className="h-5 px-1.5 shrink-0">
    {isActive ? (
      <Check className="h-3 w-3 text-green-600" />
    ) : (
      <X className="h-3 w-3 text-muted-foreground" />
    )}
  </Button>
</div>
```

## Grid Layouts

### 2-Column Medical Summary (Allergies, Conditions, Medications, Symptoms)
```tsx
<div className="grid gap-4 md:grid-cols-2">
  {/* Each section as compact frame */}
</div>
```

### 2x2 DISC Grid (always 2 columns)
```tsx
<div className="grid gap-4 grid-cols-2">
  {/* D, I, S, C tiles */}
</div>
```

### 3-Column Content (Header, Overview, Details)
```tsx
<div className="grid gap-6 md:grid-cols-3">
  {/* Sections */}
</div>
```

## Components to Remove

- **Collapsible Accordions** - Show sections by default, use visible layouts
- **Large padding** - Reduce p-6/p-8 to p-4/p-5
- **Verbose headers** - Keep headers concise
- **Large font sizes** - Use text-sm/text-xs instead of text-lg/text-xl

## Pages Updated

- ✅ Patient Overview Tab
- ✅ DISC Personality Profile
- 🔄 PatientProfile.tsx (in progress)
- 🔄 Sessions/SessionDetail.tsx (pending)
- 🔄 PatientDocuments.tsx (pending)
- 🔄 Patients list view (pending)
- ⏳ All other tabs and pages

## Implementation Checklist

For each page update:
- [ ] Remove collapsible accordions, show sections by default
- [ ] Apply rounded-xl border primary/40 bg-card to section frames
- [ ] Reduce padding from p-6 to p-4/p-5
- [ ] Update typography to text-sm headers (not text-lg+)
- [ ] Apply color-coded backgrounds to medical/categorical sections
- [ ] Use consistent gap-4 in grids (not gap-6)
- [ ] Apply compact status indicators (h-5, text-[11px])
- [ ] Test on mobile - ensure responsive behavior
- [ ] Check for visual consistency with existing updated pages
