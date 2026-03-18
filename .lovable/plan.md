

# Auto-Generated Document Draft System, To-Do Enhancements & Task Frame Reduction

## 1. Database Migration

Add columns to `documents` table and a `description` column to `todos`:

```sql
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id uuid DEFAULT NULL;

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS document_id uuid DEFAULT NULL;

-- Allow patients to update email_sent_at on their documents
CREATE POLICY "Patients can update their documents send status"
ON public.documents FOR UPDATE TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()))
WITH CHECK (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));
```

## 2. Auto-Generated Documents as DRAFT

**`src/hooks/useSessions.ts`** — When auto-generating documents (hospital admission, prescriptions, invoices, certificates, referral letters, general letters), set `is_draft: true` and `session_id`. After inserting the document, also create a todo:
```typescript
await supabase.from('todos').insert({
  user_id, session_id, patient_id,
  title: `Review & Send: ${docName}`,
  document_id: doc.id,
  task_type: 'document_review',
  priority: 'high', status: 'pending',
});
```

## 3. Session Detail — DRAFT Badge + Edit/Send Buttons

**`src/pages/SessionDetail.tsx`** — Add a "Session Documents" section querying `documents` where `session_id = currentSession.id`:
- Each row shows: document name, "DRAFT" badge (if `is_draft`), Edit (pencil) button, green Send arrow button
- For prescriptions: default send target = patient's `pharmacy_email`
- Once sent: set `email_sent_at = now()`, `is_draft = false`, mark corresponding todo as completed
- Arrow becomes greyed out after send
- Edit opens the existing document editor dialog

## 4. To-Do List Enhancements

**`src/pages/TodoList.tsx`**:

### 4a. Group by Date with Expand/Collapse
- Group `filteredTodos` by `created_at` date (formatted as "Today", "Yesterday", or date string)
- Use `Collapsible` component for each date group
- Default: all groups expanded
- Show date header with count and chevron toggle

### 4b. Show Description, Date, Patient Name
- Update `TodoItem` interface to include `description` and `patient_name`
- Update `fetchTodos` query to join patient name: `.select('*, patients(name)')`
- Each task row shows: title, description (smaller muted text below), created date, patient name badge (if linked)

### 4c. Document Review Tasks — Edit/Send Icons
- For todos with `document_id`: show Edit (pencil → navigates to `/documents?view={docId}`) and green Send arrow inline
- On send, call the send-document-email edge function, update `email_sent_at`, mark todo as done
- If already sent, arrow is greyed out

### 4d. Reduce "Add New Task" Frame by 60%
- Container: `p-6` → `p-2.5`, heading `text-lg` → `text-sm`
- Voice button: `h-16 w-16` → `h-8 w-8`, icon `h-7 w-7` → `h-4 w-4`
- Voice section: `py-4 mb-4 gap-4` → `py-1.5 mb-1.5 gap-2`
- Text input section: `gap-3` → `gap-2`, `space-y-4` → `space-y-2`
- Priority buttons and AI process row: tighter spacing

## 5. Patient Documents Tab — Sent Status

**`src/pages/PatientProfile.tsx`** (documents section):
- Show green Send arrow if `email_sent_at` is null — patient can click to send
- Greyed-out arrow if already sent (by doctor or patient)
- "DRAFT" badge if `is_draft` is true
- On patient send: update `email_sent_at` on the document

## 6. Dashboard CompactTodoList

**`src/components/dashboard/CompactTodoList.tsx`**:
- For tasks with `document_id`: show small Edit/Send icons
- Edit navigates to `/documents?view={docId}`
- Send triggers email and marks done

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `is_draft`, `session_id` to documents; `document_id` to todos; patient UPDATE policy on documents |
| `src/hooks/useSessions.ts` | Set `is_draft: true`, `session_id` on auto-generated docs; create review todos |
| `src/pages/SessionDetail.tsx` | Session Documents section with DRAFT badge, Edit & Send buttons |
| `src/pages/TodoList.tsx` | Group by date (collapsible), show description/date/patient, Edit/Send for doc tasks, reduce Add Task frame 60% |
| `src/components/dashboard/CompactTodoList.tsx` | Edit/Send icons for document_review tasks |
| `src/pages/PatientProfile.tsx` | Send status indicators on patient documents |

