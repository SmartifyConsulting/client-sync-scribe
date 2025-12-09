import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  MoreVertical,
  Eye,
  Download,
  Printer,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { TemplateForm, TemplateData } from "@/components/templates/TemplateForm";
import { useToast } from "@/hooks/use-toast";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { useDocuments, Document } from "@/hooks/useDocuments";
import { exportToPDF, printDocument } from "@/utils/documentExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DisplayTemplate extends Template {
  lastModified: string;
  placeholders: string[];
}

// Helper functions defined outside component to avoid hoisting issues
const extractPlaceholders = (content: string): string[] => {
  const matches = content.match(/\[([^\]]+)\]/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export default function Documents() {
  const { toast } = useToast();
  const { templates: dbTemplates, loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { documents, loading: documentsLoading, deleteDocument } = useDocuments();
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<DisplayTemplate | null>(null);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DisplayTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<DisplayTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DisplayTemplate | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Transform database templates to display format
  const templates: DisplayTemplate[] = dbTemplates.map(t => ({
    ...t,
    lastModified: t.updated_at ? formatDate(t.updated_at) : "Just now",
    placeholders: extractPlaceholders(t.content),
  }));

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    (template.category?.toLowerCase() || "").includes(templateSearchQuery.toLowerCase())
  );

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    (doc.patient_name?.toLowerCase() || "").includes(documentSearchQuery.toLowerCase()) ||
    (doc.template_name?.toLowerCase() || "").includes(documentSearchQuery.toLowerCase())
  );

  const handleSelectTemplate = (template: DisplayTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCloseEditor = () => {
    setSelectedTemplate(null);
  };

  const handleSaveDocument = (document: { name: string; content: string }) => {
    console.log("Saving document:", document);
    setSelectedTemplate(null);
    toast({
      title: "Document created",
      description: `"${document.name}" has been saved successfully`,
    });
  };

  const handleCreateTemplate = async (template: TemplateData) => {
    const result = await createTemplate({
      name: template.name,
      description: template.description,
      category: template.category,
      content: template.content,
      logo_url: template.logoUrl,
      logo_position: template.logoPosition,
      font_family: template.fontFamily,
    });
    
    if (result) {
      setIsNewTemplateOpen(false);
    }
  };

  const handleEditTemplate = async (template: TemplateData) => {
    if (!template.id) return;
    
    const success = await updateTemplate(template.id, {
      name: template.name,
      description: template.description,
      category: template.category,
      content: template.content,
      logo_url: template.logoUrl,
      logo_position: template.logoPosition,
      font_family: template.fontFamily,
    });
    
    if (success) {
      setEditingTemplate(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    const success = await deleteTemplate(templateToDelete.id);
    if (success) {
      setTemplateToDelete(null);
    }
  };

  const handleExportPDF = async (template: DisplayTemplate) => {
    setIsExporting(true);
    try {
      await exportToPDF({
        title: template.name,
        content: template.content,
        logoUrl: template.logo_url || undefined,
        logoPosition: template.logo_position || undefined,
        fontFamily: template.font_family || undefined,
      });
      toast({
        title: "PDF Exported",
        description: `"${template.name}" has been downloaded`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = (template: DisplayTemplate) => {
    printDocument(
      template.content,
      template.name,
      template.logo_url || undefined,
      template.font_family || undefined
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage document templates
          </p>
        </div>
        <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable document template with your practice letterhead
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              onSubmit={handleCreateTemplate}
              onCancel={() => setIsNewTemplateOpen(false)}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={templateSearchQuery}
          onChange={(e) => setTemplateSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select a template to start creating a document with voice drafting
        </p>
        
        {templatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTemplates.map((template, index) => (
              <div
                key={template.id}
                className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 text-left cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent transition-colors group-hover:bg-primary/10"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <FileText className="h-5 w-5 text-accent-foreground group-hover:text-primary" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Template
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Template
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSelectTemplate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Use Template
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportPDF(template)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint(template)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print Template
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setTemplateToDelete(template)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div onClick={() => handleSelectTemplate(template)}>
                  <h3 className="font-medium text-foreground mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {template.lastModified}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Template Card */}
            <div 
              onClick={() => setIsNewTemplateOpen(true)}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-5 text-center transition-colors hover:bg-muted/30 cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Create Template</p>
            </div>
          </div>
        )}
      </div>

      {/* All Documents */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">All Documents</h2>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {documentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <FileText className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.patient_name || "No patient"} · {formatDate(doc.created_at)} · <span className="text-primary/70">{doc.template_name || "Custom"}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setPreviewDocument(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          exportToPDF({ title: doc.name, content: doc.content });
                          toast({ title: "PDF Exported", description: `"${doc.name}" downloaded` });
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => printDocument(doc.content, doc.name)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDocumentToDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {documents.length === 0 
                    ? "No documents yet. Create your first document using a template above."
                    : "No documents found matching your search."
                  }
                </div>
              )}
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>

      {/* Document Editor Modal */}
      {selectedTemplate && (
        <DocumentEditor
          template={{
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            description: selectedTemplate.description || "",
            content: selectedTemplate.content,
            placeholders: selectedTemplate.placeholders,
          }}
          onClose={handleCloseEditor}
          onSave={handleSaveDocument}
        />
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify this template's content, logo, and settings
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              initialData={{
                id: editingTemplate.id,
                name: editingTemplate.name,
                description: editingTemplate.description || "",
                category: editingTemplate.category || "",
                content: editingTemplate.content,
                logoUrl: editingTemplate.logo_url || undefined,
                logoPosition: editingTemplate.logo_position || undefined,
                fontFamily: editingTemplate.font_family || undefined,
              }}
              onSubmit={handleEditTemplate}
              onCancel={() => setEditingTemplate(null)}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview of the template content and formatting
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {/* Template Meta */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">
                  {previewTemplate.category || "Uncategorized"}
                </span>
                <span>Last modified: {previewTemplate.lastModified}</span>
                {previewTemplate.font_family && (
                  <span>Font: {previewTemplate.font_family}</span>
                )}
              </div>

              {/* Template Preview */}
              <div className="border border-border rounded-lg p-6 bg-card/50">
                {/* Logo Preview */}
                {previewTemplate.logo_url && (
                  <div 
                    className="mb-4"
                    style={{ 
                      textAlign: previewTemplate.logo_position?.x && previewTemplate.logo_position.x > 66 
                        ? 'right' 
                        : previewTemplate.logo_position?.x && previewTemplate.logo_position.x > 33 
                          ? 'center' 
                          : 'left' 
                    }}
                  >
                    <img 
                      src={previewTemplate.logo_url} 
                      alt="Template logo" 
                      className="max-h-16 inline-block"
                    />
                  </div>
                )}
                
                {/* Content Preview */}
                <pre 
                  className={`whitespace-pre-wrap text-sm text-foreground font-${previewTemplate.font_family || 'sans'}`}
                  style={{ fontFamily: previewTemplate.font_family === 'sans' ? 'inherit' : undefined }}
                >
                  {previewTemplate.content}
                </pre>
              </div>

              {/* Placeholders */}
              {previewTemplate.placeholders && previewTemplate.placeholders.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Dynamic Placeholders:</p>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.placeholders.map((placeholder) => (
                      <span 
                        key={placeholder} 
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                      >
                        [{placeholder}]
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)} className="flex-1">
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handlePrint(previewTemplate)}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleExportPDF(previewTemplate)}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export PDF"}
                </Button>
                <Button 
                  onClick={() => {
                    handleSelectTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }} 
                  className="flex-1"
                >
                  Use Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
            <DialogDescription>
              {previewDocument?.patient_name && `Patient: ${previewDocument.patient_name} · `}
              Created: {previewDocument?.created_at ? formatDate(previewDocument.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-6 bg-card/50">
                <pre className="whitespace-pre-wrap text-sm text-foreground">
                  {previewDocument.content}
                </pre>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setPreviewDocument(null)} className="flex-1">
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => printDocument(previewDocument.content, previewDocument.name)}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    exportToPDF({ title: previewDocument.name, content: previewDocument.content });
                    toast({ title: "PDF Exported", description: `"${previewDocument.name}" downloaded` });
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (documentToDelete) {
                  await deleteDocument(documentToDelete.id);
                  setDocumentToDelete(null);
                }
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
