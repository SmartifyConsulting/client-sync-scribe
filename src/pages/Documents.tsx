import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Mic,
  Edit3,
  Trash2,
  Copy,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  category: string;
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Client Action Plan",
    description: "Structured action plan with goals, timeline, and deliverables",
    lastModified: "2 days ago",
    category: "Plan",
  },
  {
    id: "2",
    name: "Session Summary",
    description: "Standard format for session notes and key takeaways",
    lastModified: "1 week ago",
    category: "Summary",
  },
  {
    id: "3",
    name: "Letter of Advice",
    description: "Professional advice letter with recommendations",
    lastModified: "2 weeks ago",
    category: "Letter",
  },
  {
    id: "4",
    name: "Invoice Template",
    description: "Billing template with service breakdown",
    lastModified: "1 month ago",
    category: "Invoice",
  },
];

const recentDocuments = [
  { id: "1", name: "Action Plan - Sarah Johnson.pdf", date: "Dec 3, 2024", client: "Sarah Johnson" },
  { id: "2", name: "Summary - Michael Chen.pdf", date: "Nov 30, 2024", client: "Michael Chen" },
  { id: "3", name: "Advice Letter - Emma Williams.pdf", date: "Nov 28, 2024", client: "Emma Williams" },
];

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage document templates
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Mic className="h-4 w-4" />
            Voice Draft
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Templates</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockTemplates.map((template, index) => (
            <div
              key={template.id}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent transition-colors group-hover:bg-primary/10">
                  <FileText className="h-5 w-5 text-accent-foreground group-hover:text-primary" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
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
          ))}

          {/* Add New Template Card */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-5 text-center transition-colors hover:bg-muted/30 cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">Create Template</p>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Documents</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {recentDocuments.map((doc) => (
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
                    {doc.client} · {doc.date}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
