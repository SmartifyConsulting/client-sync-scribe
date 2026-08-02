import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  
  Loader2,
  Send,
  ArrowUpRight,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  SECTION_TRIGGER_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SectionCountPill,
  DATE_BUCKETS,
  dateBucketFor,
} from "@/components/ui/section-accordion";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { TemplateForm, TemplateData } from "@/components/templates/TemplateForm";
import { HeaderTemplateForm, HeaderTemplateFormData } from "@/features/documents/templates/HeaderTemplateForm";
import { FooterTemplateForm, FooterTemplateFormData } from "@/features/documents/templates/FooterTemplateForm";
import { useToast } from "@/hooks/use-toast";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { useHeaderTemplates, HeaderTemplate } from "@/hooks/useHeaderTemplates";
import { useFooterTemplates, FooterTemplate } from "@/hooks/useFooterTemplates";
import type { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";
import { useDocuments, Document } from "@/hooks/useDocuments";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";
import { useProfile } from "@/hooks/useProfile";
import { exportToPDF } from "@/utils/documentExport";
import { renderFormattedContent } from "@/utils/documentFormatting";
import { supabase } from "@/integrations/supabase/client";
import { fillDocumentPlaceholders } from "@/lib/fillDocumentPlaceholders";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";
import { resolveTemplatePreviewTokens, resolveHeaderFooterTokens } from "@/features/documents/lib/resolveTemplatePreview";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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

// Helper functions
const extractPlaceholders = (content: string): string[] => {
  const matches = content.match(/\[([^\]]+)\]/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};


export default function Documents({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    templates: dbTemplates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();
  const {
    templates: headerTemplates,
    isLoading: headerLoading,
    createTemplate: createHeaderTemplateMutation,
    updateTemplate: updateHeaderTemplateMutation,
    deleteTemplate: deleteHeaderTemplateMutation,
  } = useHeaderTemplates();
  const {
    templates: footerTemplates,
    isLoading: footerLoading,
    createTemplate: createFooterTemplateMutation,
    updateTemplate: updateFooterTemplateMutation,
    deleteTemplate: deleteFooterTemplateMutation,
  } = useFooterTemplates();
  const { documents, loading: documentsLoading, deleteDocument, updateDocument, fetchDocuments } = useDocuments();
  const { profile } = useProfile();

  const [activeTab, setActiveTab] = useState("content");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<"date" | "type" | "patient">("date");
  const DOC_PAGE_SIZE = 10;
  const [visibleDocCount, setVisibleDocCount] = useState(DOC_PAGE_SIZE);
  useEffect(() => { setVisibleDocCount(DOC_PAGE_SIZE); }, [documentSearchQuery]);
  const [selectedTemplate, setSelectedTemplate] = useState<DisplayTemplate | null>(null);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [isNewHeaderTemplateOpen, setIsNewHeaderTemplateOpen] = useState(false);
  const [isNewFooterTemplateOpen, setIsNewFooterTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DisplayTemplate | null>(null);
  const [editingHeaderTemplate, setEditingHeaderTemplate] = useState<HeaderTemplate | null>(null);
  const [editingFooterTemplate, setEditingFooterTemplate] = useState<FooterTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<DisplayTemplate | null>(null);
  const [headerTemplateToDelete, setHeaderTemplateToDelete] = useState<HeaderTemplate | null>(null);
  const [footerTemplateToDelete, setFooterTemplateToDelete] = useState<FooterTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DisplayTemplate | null>(null);
  const [previewHeaderTemplate, setPreviewHeaderTemplate] = useState<HeaderTemplate | null>(null);
  const [previewFooterTemplate, setPreviewFooterTemplate] = useState<FooterTemplate | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocContent, setEditDocContent] = useState("");

  // Auto-open document preview from ?view= param
  useEffect(() => {
    const viewDocId = searchParams.get("view");
    if (viewDocId && documents.length > 0) {
      const doc = documents.find((d) => d.id === viewDocId);
      if (doc) {
        setActiveTab("documents");
        setPreviewDocument(doc);
        // Clear the param so refreshing doesn't re-open
        searchParams.delete("view");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [documents, searchParams]);


  const templates: DisplayTemplate[] = dbTemplates.map((t) => ({
    ...t,
    lastModified: t.updated_at ? formatDate(t.updated_at) : "Just now",
    placeholders: extractPlaceholders(t.content),
  }));

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()),
  );

  const filteredHeaderTemplates = headerTemplates.filter((template) =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()),
  );
  const filteredFooterTemplates = footerTemplates.filter((template) =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()),
  );

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
      (doc.patient_name?.toLowerCase() || "").includes(documentSearchQuery.toLowerCase()) ||
      (doc.template_name?.toLowerCase() || "").includes(documentSearchQuery.toLowerCase()),
  );

  const documentGroups: { key: string; label: string; items: Document[] }[] = (() => {
    if (groupBy === "date") {
      const buckets: Record<string, Document[]> = { today: [], week: [], month: [], older: [] };
      for (const doc of filteredDocuments) buckets[dateBucketFor(doc.created_at)].push(doc);
      return DATE_BUCKETS.map((b) => ({ key: b.key, label: b.label, items: buckets[b.key] }));
    }
    const map = new Map<string, Document[]>();
    for (const doc of filteredDocuments) {
      const key =
        groupBy === "patient"
          ? doc.patient_name || "No patient"
          : doc.template_name || "Custom";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({ key, label: key, items }));
  })();
  const defaultOpenDocGroup = documentGroups.length ? [documentGroups[0].key] : [];

  /** Sub-groups a date bucket's documents by patient, so the Date view reads the same as Patient view within each bucket. */
  const patientGroups = (items: Document[]): [string, Document[]][] => {
    const map = new Map<string, Document[]>();
    for (const doc of items) {
      const key = doc.patient_name || "No patient";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const renderDocRow = (doc: Document) => (
    <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
        <FileText className="h-5 w-5 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
        <p className="text-sm text-muted-foreground">
          {doc.patient_name || "No patient"} · {formatDate(doc.created_at)} ·{" "}
          <span className="text-primary/70">{doc.template_name || "Custom"}</span>
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPreviewDocument(doc)}
          title="Preview"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setEditingDocument(doc);
            setEditDocName(doc.name);
            setEditDocContent(doc.content);
          }}
          title="Edit"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShareDocument(doc)}
          title={(doc as any).email_sent_at ? "Already sent" : "Share via Email"}
        >
          {(doc as any).email_sent_at ? (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Send className="h-4 w-4 text-green-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            exportToPDF({ title: doc.name, content: doc.content });
            toast({ title: "PDF Downloaded", description: `"${doc.name}" downloaded` });
          }}
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDocumentToDelete(doc)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
      header_template_id: template.headerTemplateId,
      footer_template_id: template.footerTemplateId,
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
      header_template_id: template.headerTemplateId,
      footer_template_id: template.footerTemplateId,
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

  const handleCreateHeaderTemplate = async (template: HeaderTemplateFormData) => {
    await createHeaderTemplateMutation.mutateAsync({
      name: template.name,
      description: template.description,
      section: template.section,
      font_family: template.fontFamily || "sans",
      is_default: false,
    });
    setIsNewHeaderTemplateOpen(false);
  };

  const handleEditHeaderTemplate = async (template: HeaderTemplateFormData) => {
    if (!template.id) return;
    await updateHeaderTemplateMutation.mutateAsync({
      id: template.id,
      name: template.name,
      description: template.description,
      section: template.section,
      font_family: template.fontFamily || "sans",
    });
    setEditingHeaderTemplate(null);
  };

  const handleDeleteHeaderTemplate = async () => {
    if (!headerTemplateToDelete) return;
    await deleteHeaderTemplateMutation.mutateAsync(headerTemplateToDelete.id);
    setHeaderTemplateToDelete(null);
  };

  const handleCreateFooterTemplate = async (template: FooterTemplateFormData) => {
    await createFooterTemplateMutation.mutateAsync({
      name: template.name,
      description: template.description,
      section: template.section,
      font_family: template.fontFamily || "sans",
      is_default: false,
    });
    setIsNewFooterTemplateOpen(false);
  };

  const handleEditFooterTemplate = async (template: FooterTemplateFormData) => {
    if (!template.id) return;
    await updateFooterTemplateMutation.mutateAsync({
      id: template.id,
      name: template.name,
      description: template.description,
      section: template.section,
      font_family: template.fontFamily || "sans",
    });
    setEditingFooterTemplate(null);
  };

  const handleDeleteFooterTemplate = async () => {
    if (!footerTemplateToDelete) return;
    await deleteFooterTemplateMutation.mutateAsync(footerTemplateToDelete.id);
    setFooterTemplateToDelete(null);
  };

  // Builds the same combined shape the rendering pipeline (DocumentPreview,
  // resolveHeaderFooterTokens) already expects, from two independently
  // selected templates.
  const combineHeaderFooter = (
    header: HeaderTemplate | undefined,
    footer: FooterTemplate | undefined,
  ): HeaderFooterTemplate | null => {
    if (!header && !footer) return null;
    const emptySection = { left: { text: "", alignment: "left" }, center: { text: "", alignment: "center" }, right: { text: "", alignment: "right" } };
    return {
      id: header?.id || footer?.id || "",
      user_id: header?.user_id || footer?.user_id || "",
      name: header?.name || footer?.name || "",
      description: header?.description ?? footer?.description ?? null,
      header: (header?.section as any) || emptySection,
      footer: (footer?.section as any) || emptySection,
      font_family: header?.font_family || footer?.font_family || null,
      is_default: !!(header?.is_default || footer?.is_default),
      created_at: header?.created_at || footer?.created_at || "",
      updated_at: header?.updated_at || footer?.updated_at || "",
    };
  };

  const handleSendDocumentEmail = async () => {
    if (!shareDocument || !shareEmail) return;

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: shareEmail,
          subject: shareDocument.name,
          documentName: shareDocument.name,
          documentContent: shareDocument.content,
          senderName: profile?.full_name || "Holarc User",
          practiceName: profile?.practice_address ? `Practice #${profile.practice_number}` : undefined,
        },
      });

      if (error) throw error;

      // Mark document as sent
      await supabase
        .from('documents')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', shareDocument.id);

      // Refresh documents list
      await fetchDocuments();

      toast({
        title: "Document Sent",
        description: `"${shareDocument.name}" has been emailed to ${shareEmail}`,
      });
      setShareDocument(null);
      setShareEmail("");
    } catch (error) {
      console.error("Email error:", error);
      toast({
        title: "Failed to Send",
        description: "Could not send the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const renderHFSectionPreview = (section: { text: string; alignment: string; imageUrl?: string }) => {
    return (
      <div style={{ textAlign: section.alignment as any }}>
        {section.imageUrl && <img src={section.imageUrl} alt="" className="max-h-10 inline-block mb-1" />}
        {section.text && (
          <div
            className="whitespace-pre-wrap text-xs"
            dangerouslySetInnerHTML={{ __html: renderFormattedContent(section.text) }}
          />
        )}
      </div>
    );
  };

  return (
    <div className={cn("animate-fade-in", hideHeader ? "space-y-4" : "space-y-8")}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">{t("nav.myDocuments", "Documents")}</h1>
            <p className="mt-1 text-muted-foreground text-xs">Manage header/footer layouts and content templates separately</p>
          </div>
        </div>
      )}

      {/* Tabs for Template Types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-neutral-600">
          <TabsTrigger
            value="content"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t("documents.tabContent")}
          </TabsTrigger>
          <TabsTrigger
            value="header-footer"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            {t("documents.tabHeaderFooter")}
          </TabsTrigger>
        </TabsList>

        {/* Header/Footer Templates Tab — two fully independent template types */}
        <TabsContent value="header-footer" className="space-y-8">
          {/* Search (shared) */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search header/footer templates..."
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Header Templates */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Design reusable headers, managed independently from footers
              </p>
              <Dialog open={isNewHeaderTemplateOpen} onOpenChange={setIsNewHeaderTemplateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Header
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Header Template</DialogTitle>
                    <DialogDescription>Design a reusable header layout for your documents</DialogDescription>
                  </DialogHeader>
                  <HeaderTemplateForm
                    onSubmit={handleCreateHeaderTemplate}
                    onCancel={() => setIsNewHeaderTemplateOpen(false)}
                    mode="create"
                  />
                </DialogContent>
              </Dialog>
            </div>

            {headerLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredHeaderTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group rounded-xl border border-primary bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent transition-colors group-hover:bg-primary/10">
                        <LayoutTemplate className="h-5 w-5 text-accent-foreground group-hover:text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewHeaderTemplate(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingHeaderTemplate(template)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setHeaderTemplateToDelete(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description || "No description"}
                    </p>
                    <span className="text-sm text-muted-foreground">{formatDate(template.updated_at)}</span>
                  </div>
                ))}

                <div
                  onClick={() => setIsNewHeaderTemplateOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-5 text-center transition-colors hover:bg-muted/30 cursor-pointer min-h-[160px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Create Header</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Templates */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Design reusable footers, managed independently from headers
              </p>
              <Dialog open={isNewFooterTemplateOpen} onOpenChange={setIsNewFooterTemplateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Footer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Footer Template</DialogTitle>
                    <DialogDescription>Design a reusable footer layout for your documents</DialogDescription>
                  </DialogHeader>
                  <FooterTemplateForm
                    onSubmit={handleCreateFooterTemplate}
                    onCancel={() => setIsNewFooterTemplateOpen(false)}
                    mode="create"
                  />
                </DialogContent>
              </Dialog>
            </div>

            {footerLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFooterTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group rounded-xl border border-primary bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent transition-colors group-hover:bg-primary/10">
                        <LayoutTemplate className="h-5 w-5 text-accent-foreground group-hover:text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewFooterTemplate(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingFooterTemplate(template)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setFooterTemplateToDelete(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description || "No description"}
                    </p>
                    <span className="text-sm text-muted-foreground">{formatDate(template.updated_at)}</span>
                  </div>
                ))}

                <div
                  onClick={() => setIsNewFooterTemplateOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-5 text-center transition-colors hover:bg-muted/30 cursor-pointer min-h-[160px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Create Footer</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Content Templates Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("documents.contentHelper")}
            </p>
            <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("documents.newContent")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[83rem] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Content Template</DialogTitle>
                  <DialogDescription>Create a reusable document content template</DialogDescription>
                </DialogHeader>
                <TemplateForm
                  onSubmit={handleCreateTemplate}
                  onCancel={() => setIsNewTemplateOpen(false)}
                  mode="create"
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("documents.searchContent")}
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content Templates Grid */}
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className="group rounded-xl border border-primary bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 text-left cursor-pointer"
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
                          className="h-8 w-8 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSelectTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setTemplateToDelete(template)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div onClick={() => handleSelectTemplate(template)}>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                    {(() => {
                      const linkedHeader = headerTemplates.find(
                        (h) => h.id === (template as any).header_template_id,
                      );
                      const linkedFooter = footerTemplates.find(
                        (f) => f.id === (template as any).footer_template_id,
                      );
                      return (
                        <p className="text-sm text-muted-foreground mb-2">
                          Header:{" "}
                          <span className="font-medium text-foreground">
                            {linkedHeader?.name ?? t("documents.letterheadDefault")}
                          </span>
                          {" · "}Footer:{" "}
                          <span className="font-medium text-foreground">
                            {linkedFooter?.name ?? t("documents.letterheadDefault")}
                          </span>
                        </p>
                      );
                    })()}
                    <span className="text-sm text-muted-foreground">{template.lastModified}</span>
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
                <p className="text-sm font-medium text-muted-foreground">{t("documents.createTemplate")}</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* All Documents Section */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("documents.patientDocuments")}</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("documents.searchDocuments")}
                value={documentSearchQuery}
                onChange={(e) => setDocumentSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ToggleGroup
              type="single"
              value={groupBy}
              onValueChange={(v) => v && setGroupBy(v as typeof groupBy)}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              <ToggleGroupItem value="date" className="text-xs px-3">Date</ToggleGroupItem>
              <ToggleGroupItem value="type" className="text-xs px-3">Type</ToggleGroupItem>
              <ToggleGroupItem value="patient" className="text-xs px-3">Patient</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {documentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Accordion
            key={groupBy}
            type="multiple"
            defaultValue={defaultOpenDocGroup}
            className={SECTION_FRAME_CLASS}
          >
            {filteredDocuments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {documents.length === 0
                  ? "No documents yet. Create your first document using a template above."
                  : "No documents found matching your search."}
              </div>
            ) : (
              documentGroups.map((group) => (
                <AccordionItem key={group.key} value={group.key} className={SECTION_ITEM_CLASS}>
                  <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-xs font-medium">{group.label}</span>
                      <SectionCountPill count={group.items.length} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-0">
                    {group.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-3">No documents in this group.</p>
                    ) : groupBy === "date" ? (
                      <Accordion type="multiple" className="divide-y divide-border">
                        {patientGroups(group.items).map(([patientName, items]) => (
                          <AccordionItem key={patientName} value={patientName} className="border-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                              <div className="flex items-center justify-between w-full pr-2">
                                <span className="text-sm font-semibold">{patientName}</span>
                                <SectionCountPill count={items.length} />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-0">
                              <div className="divide-y divide-border">
                                {items.map((doc) => renderDocRow(doc))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="divide-y divide-border">
                        {group.items.map((doc) => renderDocRow(doc))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        )}
        {visibleDocCount < filteredDocuments.length && (
          <div className="flex justify-center mt-3">
            <Button variant="outline" onClick={() => setVisibleDocCount((c) => c + DOC_PAGE_SIZE)}>
              Load more ({visibleDocCount} of {filteredDocuments.length})
            </Button>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Showing {Math.min(visibleDocCount, filteredDocuments.length)} of {filteredDocuments.length} documents
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
            category: selectedTemplate.category || undefined,
          }}
          onClose={handleCloseEditor}
          onSave={handleSaveDocument}
        />
      )}

      {/* Edit Content Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-[83rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content Template</DialogTitle>
            <DialogDescription>Modify this template's content</DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              initialData={{
                id: editingTemplate.id,
                name: editingTemplate.name,
                description: editingTemplate.description || "",
                category: editingTemplate.category || "",
                content: editingTemplate.content,
                headerTemplateId: (editingTemplate as any).header_template_id || "",
                footerTemplateId: (editingTemplate as any).footer_template_id || "",
              }}
              onSubmit={handleEditTemplate}
              onCancel={() => setEditingTemplate(null)}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Header Template Dialog */}
      <Dialog open={!!editingHeaderTemplate} onOpenChange={(open) => !open && setEditingHeaderTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Header Template</DialogTitle>
            <DialogDescription>Modify this header layout</DialogDescription>
          </DialogHeader>
          {editingHeaderTemplate && (
            <HeaderTemplateForm
              initialData={{
                id: editingHeaderTemplate.id,
                name: editingHeaderTemplate.name,
                description: editingHeaderTemplate.description || "",
                fontFamily: editingHeaderTemplate.font_family || "sans",
                section: editingHeaderTemplate.section as any,
              }}
              onSubmit={handleEditHeaderTemplate}
              onCancel={() => setEditingHeaderTemplate(null)}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Footer Template Dialog */}
      <Dialog open={!!editingFooterTemplate} onOpenChange={(open) => !open && setEditingFooterTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Footer Template</DialogTitle>
            <DialogDescription>Modify this footer layout</DialogDescription>
          </DialogHeader>
          {editingFooterTemplate && (
            <FooterTemplateForm
              initialData={{
                id: editingFooterTemplate.id,
                name: editingFooterTemplate.name,
                description: editingFooterTemplate.description || "",
                fontFamily: editingFooterTemplate.font_family || "sans",
                section: editingFooterTemplate.section as any,
              }}
              onSubmit={handleEditFooterTemplate}
              onCancel={() => setEditingFooterTemplate(null)}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Content Template Confirmation */}
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

      {/* Delete Header Template Confirmation */}
      <AlertDialog open={!!headerTemplateToDelete} onOpenChange={(open) => !open && setHeaderTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Header Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{headerTemplateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHeaderTemplate} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Footer Template Confirmation */}
      <AlertDialog open={!!footerTemplateToDelete} onOpenChange={(open) => !open && setFooterTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Footer Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{footerTemplateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFooterTemplate} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content Template Preview Dialog — uses the same surface as document previews */}
      {previewTemplate && (
        <DocumentPreview
          title={previewTemplate.name}
          subtitle={previewTemplate.description || "Template preview"}
          content={resolveTemplatePreviewTokens(previewTemplate.content, profile as any)}
          logoUrl={profile?.logo_url || undefined}
          fontFamily={
            headerTemplates.find((h) => h.id === (previewTemplate as any).header_template_id)?.font_family ||
            footerTemplates.find((f) => f.id === (previewTemplate as any).footer_template_id)?.font_family ||
            undefined
          }
          headerFooter={resolveHeaderFooterTokens(
            combineHeaderFooter(
              headerTemplates.find((h) => h.id === (previewTemplate as any).header_template_id),
              footerTemplates.find((f) => f.id === (previewTemplate as any).footer_template_id),
            ),
            profile as any,
          )}
          onClose={() => setPreviewTemplate(null)}
          extraActions={
            <Button
              onClick={() => {
                handleSelectTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}
            >
              Use Template
            </Button>
          }
        />
      )}


      {/* Header Template Preview Dialog */}
      <Dialog open={!!previewHeaderTemplate} onOpenChange={(open) => !open && setPreviewHeaderTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewHeaderTemplate?.name}</DialogTitle>
            <DialogDescription>{previewHeaderTemplate?.description || "Header preview"}</DialogDescription>
          </DialogHeader>
          {previewHeaderTemplate && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-6 bg-white">
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 mb-4">
                  {renderHFSectionPreview(previewHeaderTemplate.section.left)}
                  {renderHFSectionPreview(previewHeaderTemplate.section.center)}
                  {renderHFSectionPreview(previewHeaderTemplate.section.right)}
                </div>
                <div className="min-h-[60px] py-4 flex items-center justify-center">
                  <p className="text-gray-400 italic text-sm">Document content appears here</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setPreviewHeaderTemplate(null)} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingHeaderTemplate(previewHeaderTemplate);
                    setPreviewHeaderTemplate(null);
                  }}
                  className="flex-1"
                >
                  Edit Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer Template Preview Dialog */}
      <Dialog open={!!previewFooterTemplate} onOpenChange={(open) => !open && setPreviewFooterTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewFooterTemplate?.name}</DialogTitle>
            <DialogDescription>{previewFooterTemplate?.description || "Footer preview"}</DialogDescription>
          </DialogHeader>
          {previewFooterTemplate && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-6 bg-white">
                <div className="min-h-[60px] py-4 flex items-center justify-center">
                  <p className="text-gray-400 italic text-sm">Document content appears here</p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 mt-4">
                  {renderHFSectionPreview(previewFooterTemplate.section.left)}
                  {renderHFSectionPreview(previewFooterTemplate.section.center)}
                  {renderHFSectionPreview(previewFooterTemplate.section.right)}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setPreviewFooterTemplate(null)} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingFooterTemplate(previewFooterTemplate);
                    setPreviewFooterTemplate(null);
                  }}
                  className="flex-1"
                >
                  Edit Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview - shared component with letterhead + Send + Print */}
      {previewDocument && (
        <DocumentPreviewWithLetterhead
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}

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

      {/* Share Document Dialog */}
      <Dialog
        open={!!shareDocument}
        onOpenChange={(open) => {
          if (!open) {
            setShareDocument(null);
            setShareEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Send "{shareDocument?.name}" via email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            {shareDocument?.patient_name && (
              <p className="text-sm text-muted-foreground">Patient: {shareDocument.patient_name}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShareDocument(null);
                setShareEmail("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendDocumentEmail} disabled={!shareEmail || isSendingEmail} className="gap-2">
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog
        open={!!editingDocument}
        onOpenChange={(open) => {
          if (!open) setEditingDocument(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update the document name and content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-name">Document Name</Label>
              <Input
                id="edit-doc-name"
                value={editDocName}
                onChange={(e) => setEditDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-content">Content (HTML)</Label>
              <textarea
                id="edit-doc-content"
                value={editDocContent}
                onChange={(e) => setEditDocContent(e.target.value)}
                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
            </div>
            {editDocContent && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border border-border rounded-lg p-4 bg-white">
                  <div
                    className="whitespace-pre-wrap text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(editDocContent) }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDocument(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (editingDocument) {
                  const success = await updateDocument(editingDocument.id, {
                    name: editDocName,
                    content: editDocContent,
                  });
                  if (success) setEditingDocument(null);
                }
              }}
              disabled={!editDocName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface HFCell {
  text: string;
  alignment: string;
  imageUrl?: string;
}

function DocumentPreviewWithLetterhead({
  document,
  onClose,
}: {
  document: Document;
  onClose: () => void;
}) {
  const { headerFooter } = useDocumentHeaderFooter(document);
  const { profile } = useProfile();
  const [resolvedContent, setResolvedContent] = useState<string>(document.content);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const resolved = await resolveDocumentPreviewContent({
          id: document.id,
          content: document.content,
          user_id: (document as any).user_id,
          patient_id: document.patient_id,
          template_name: document.template_name,
          session_id: (document as any).session_id ?? null,
          name: document.name,
        });
        if (!cancelled) setResolvedContent(resolved.resolvedContent);
      } catch (err) {
        console.error('Preview resolve error:', err);
        if (!cancelled) setResolvedContent(document.content || '');
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  return (
    <DocumentPreview
      title={document.name}
      subtitle={document.patient_name ? `Patient: ${document.patient_name}` : undefined}
      content={resolving ? document.content : resolvedContent}
      logoUrl={profile?.logo_url || undefined}
      fontFamily={headerFooter?.font_family || undefined}
      headerFooter={headerFooter}
      onClose={onClose}
    />
  );
}

function DocumentPreviewBody({
  document,
  renderSection,
}: {
  document: Document;
  renderSection: (section: HFCell) => JSX.Element;
}) {
  const { headerFooter } = useDocumentHeaderFooter(document);
  if (!headerFooter) {
    return (
      <div
        className="whitespace-pre-wrap text-sm text-foreground min-h-[100px]"
        dangerouslySetInnerHTML={{ __html: renderFormattedContent(document.content) }}
      />
    );
  }

  const header = headerFooter.header as {
    left?: HFCell;
    center?: HFCell;
    right?: HFCell;
  } | null;
  const footer = headerFooter.footer as {
    left?: HFCell;
    center?: HFCell;
    right?: HFCell;
  } | null;

  return (
    <>
      {header && (
        <div className="pb-4 border-b border-border mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div>{header.left && renderSection(header.left)}</div>
            <div>{header.center && renderSection(header.center)}</div>
            <div>{header.right && renderSection(header.right)}</div>
          </div>
        </div>
      )}

      <div
        className="whitespace-pre-wrap text-sm text-foreground min-h-[100px]"
        dangerouslySetInnerHTML={{ __html: renderFormattedContent(document.content) }}
      />

      {footer && (
        <div className="pt-4 border-t border-border mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div>{footer.left && renderSection(footer.left)}</div>
            <div>{footer.center && renderSection(footer.center)}</div>
            <div>{footer.right && renderSection(footer.right)}</div>
          </div>
        </div>
      )}
    </>
  );
}
