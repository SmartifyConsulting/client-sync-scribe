import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Plus,
  X,
  Clock,
  Tag,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Clinical tag presets for common medical annotations
export const CLINICAL_TAGS = [
  { id: "fracture", label: "Fracture", color: "#DC143C" },
  { id: "tumor", label: "Tumor", color: "#8B0000" },
  { id: "post-op", label: "Post-Op", color: "#228B22" },
  { id: "inflammation", label: "Inflammation", color: "#FF4500" },
  { id: "lesion", label: "Lesion", color: "#800080" },
  { id: "necrosis", label: "Necrosis", color: "#4A4A4A" },
  { id: "infection", label: "Infection", color: "#FF6347" },
  { id: "deformity", label: "Deformity", color: "#DAA520" },
  { id: "edema", label: "Edema", color: "#4169E1" },
  { id: "atrophy", label: "Atrophy", color: "#708090" },
  { id: "hypertrophy", label: "Hypertrophy", color: "#2E8B57" },
  { id: "calcification", label: "Calcification", color: "#F5DEB3" },
  { id: "hemorrhage", label: "Hemorrhage", color: "#B22222" },
  { id: "stenosis", label: "Stenosis", color: "#6B8E23" },
  { id: "follow-up", label: "Follow-Up", color: "#1E90FF" },
] as const;

export interface ClinicalNote {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedElementId?: string; // Optional link to a specific canvas element
}

export interface AnnotationTimestamp {
  id: string;
  text: string;
  timestamp: Date;
  elementId: string;
  tags: string[];
}

interface ClinicalNotesPanelProps {
  notes: ClinicalNote[];
  onAddNote: (content: string, tags: string[]) => void;
  onUpdateNote: (id: string, content: string, tags: string[]) => void;
  onDeleteNote: (id: string) => void;
  timestamps: AnnotationTimestamp[];
  selectedElementId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ClinicalNotesPanel({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  timestamps,
  selectedElementId,
  isCollapsed = false,
  onToggleCollapse,
}: ClinicalNotesPanelProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");

  const toggleTag = (tagId: string, isEditing = false) => {
    if (isEditing) {
      setEditTags(prev =>
        prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
      );
    } else {
      setSelectedTags(prev =>
        prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
      );
    }
  };

  const addCustomTag = (isEditing = false) => {
    if (!customTagInput.trim()) return;
    const tagId = customTagInput.toLowerCase().replace(/\s+/g, "-");
    if (isEditing) {
      if (!editTags.includes(tagId)) {
        setEditTags(prev => [...prev, tagId]);
      }
    } else {
      if (!selectedTags.includes(tagId)) {
        setSelectedTags(prev => [...prev, tagId]);
      }
    }
    setCustomTagInput("");
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent, selectedTags);
    setNewNoteContent("");
    setSelectedTags([]);
    setIsAddingNote(false);
  };

  const startEditing = (note: ClinicalNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditTags([...note.tags]);
  };

  const saveEdit = () => {
    if (!editingNoteId || !editContent.trim()) return;
    onUpdateNote(editingNoteId, editContent, editTags);
    setEditingNoteId(null);
    setEditContent("");
    setEditTags([]);
  };

  const getTagInfo = (tagId: string) => {
    const preset = CLINICAL_TAGS.find(t => t.id === tagId);
    if (preset) return preset;
    return { id: tagId, label: tagId, color: "#6B7280" };
  };

  // Filter timestamps for the selected element
  const elementTimestamps = selectedElementId
    ? timestamps.filter(t => t.elementId === selectedElementId)
    : [];

  if (isCollapsed) {
    return (
      <div className="w-10 bg-muted/30 border-r flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapse}
          title="Show Notes"
        >
          <FileText className="h-4 w-4" />
        </Button>
        {notes.length > 0 && (
          <Badge variant="secondary" className="mt-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
            {notes.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="w-72 border-r bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
            Clinical Notes
          </h4>
          {notes.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {notes.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsAddingNote(!isAddingNote)}
            title="Add Note"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleCollapse}
              title="Collapse"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Add Note Form */}
      {isAddingNote && (
        <div className="p-3 border-b bg-background/50 space-y-3">
          <Textarea
            placeholder="Enter clinical note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />

          {/* Tag Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </span>
              <Popover open={showTagPicker} onOpenChange={setShowTagPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                    <Plus className="h-3 w-3 mr-1" /> Add Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Clinical Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {CLINICAL_TAGS.map(tag => (
                        <button
                          key={tag.id}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                            selectedTags.includes(tag.id)
                              ? "ring-2 ring-offset-1"
                              : "opacity-70 hover:opacity-100"
                          )}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: tag.color,
                          }}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 pt-1 border-t">
                      <Input
                        placeholder="Custom tag..."
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomTag();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => addCustomTag()}
                        disabled={!customTagInput.trim()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tagId => {
                  const tag = getTagInfo(tagId);
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.label}
                      <button
                        className="hover:bg-black/10 rounded-full p-0.5"
                        onClick={() => toggleTag(tagId)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleAddNote}>
              <Check className="h-3.5 w-3.5 mr-1" /> Save Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteContent("");
                setSelectedTags([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {notes.length === 0 && !isAddingNote ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No clinical notes yet</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-1"
                onClick={() => setIsAddingNote(true)}
              >
                Add your first note
              </Button>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className={cn(
                  "p-2.5 rounded-lg border bg-background transition-all",
                  editingNoteId === note.id && "ring-2 ring-primary"
                )}
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-1">
                      {CLINICAL_TAGS.slice(0, 8).map(tag => (
                        <button
                          key={tag.id}
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-all",
                            editTags.includes(tag.id)
                              ? "ring-1 ring-offset-1"
                              : "opacity-50 hover:opacity-80"
                          )}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                          onClick={() => toggleTag(tag.id, true)}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-xs flex-1" onClick={saveEdit}>
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => setEditingNoteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Timestamp */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => startEditing(note)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={() => onDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map(tagId => {
                          const tag = getTagInfo(tagId);
                          return (
                            <span
                              key={tagId}
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Updated indicator */}
                    {note.updatedAt > note.createdAt && (
                      <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                        Edited {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Annotation Timestamps Section */}
      {elementTimestamps.length > 0 && (
        <div className="border-t">
          <div className="p-2 bg-muted/30">
            <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> Annotation History
            </h5>
          </div>
          <ScrollArea className="max-h-32">
            <div className="p-2 space-y-1">
              {elementTimestamps.map(ts => (
                <div
                  key={ts.id}
                  className="text-xs p-1.5 rounded bg-muted/50 flex items-start gap-2"
                >
                  <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{ts.text}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(ts.timestamp), "MMM d, h:mm:ss a")}
                    </p>
                    {ts.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {ts.tags.map(tagId => {
                          const tag = getTagInfo(tagId);
                          return (
                            <span
                              key={tagId}
                              className="px-1 py-0 rounded text-[8px] font-medium"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
