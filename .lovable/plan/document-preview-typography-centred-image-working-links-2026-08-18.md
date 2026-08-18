# Document preview: typography, centred image, working links

Three changes to how documents render in the preview (and print/share, which share the same renderer).

## 1. Body text matches the header font

Today the body renders at 12pt while the letterhead header/footer render at 10.5pt, so a document looks like two different typefaces sizes stacked. The body will use the same font family and the same 10.5pt size as the header text, in normal (non-bold) weight. Headings inside the body keep their emphasis; only the default body text changes.

## 2. Attachment image centred above the AI interpretation

Uploaded files (X-ray, CT, photo, PDF) currently render side by side with their AI text on wide screens. Instead the file will render centred, full-width-limited, at the top of the document, with "AI interpretation" and "Transcribed content" underneath it in normal reading order.

## 3. Working links at the bottom of documents

Links such as "Open original file" are currently stripped by the content sanitiser, so they show as plain text. Anchor tags will be allowed through the sanitiser (https/mailto/tel only, forced `target="_blank" rel="noopener noreferrer"`), and the original-file link will sit as a clearly styled link line at the bottom of the document for every attachment type, including PDFs.

## Technical notes

- `src/features/documents/templates/DocumentCanvas.tsx`: set `bodyFontSize` to the section size (10.5pt) and keep `fontWeight: normal` on the body wrapper.
- `src/features/documents/utils/documentFormatting.ts`: add `a` to the safe-tag pattern, to DOMPurify `ALLOWED_TAGS`, add `href`/`target`/`rel` to `ALLOWED_ATTR`, and add a DOMPurify hook (or post-pass) that forces `target="_blank" rel="noopener noreferrer"` on anchors. Existing `javascript:`/`data:text/html` scrubbing and the URI regexp stay as-is.
- `src/features/documents/lib/resolveDocumentPreviewContent.ts` (`buildUploadPreview`): drop the flex two-column wrapper; emit centred media (`text-align:center`, image `max-width:100%`) then the description block; always append the "Open original file" link at the bottom, PDFs included.
