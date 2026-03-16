import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STORAGE_LIMIT_MB = 100;

interface PatientDocument {
  id: string;
  name: string;
  content: string;
  template_name: string | null;
  created_at: string;
  media_type: string | null;
}

export default function PatientDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMB, setStorageMB] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function fetchDocuments() {
      setLoading(true);
      // Get patient records linked to this user
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user!.id);

      if (!patients?.length) {
        setLoading(false);
        return;
      }

      const patientIds = patients.map((p) => p.id);

      const { data: docs } = await supabase
        .from("documents")
        .select("id, name, content, template_name, created_at, media_type")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      if (docs) {
        setDocuments(docs);
        // Calculate storage: sum of content field byte lengths
        const totalBytes = docs.reduce(
          (acc, doc) => acc + new Blob([doc.content]).size,
          0
        );
        setStorageMB(totalBytes / (1024 * 1024));
      }
      setLoading(false);
    }

    fetchDocuments();
  }, [user]);

  const usagePercent = Math.min((storageMB / STORAGE_LIMIT_MB) * 100, 100);
  const isNearLimit = usagePercent >= 80;
  const isOverLimit = usagePercent >= 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Documents</h1>
        <p className="text-muted-foreground">
          View all documents generated from your consultations.
        </p>
      </div>

      {/* Storage Usage Indicator */}
      <Card className={isOverLimit ? "border-destructive" : isNearLimit ? "border-yellow-500" : ""}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Storage Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {storageMB.toFixed(2)} MB / {STORAGE_LIMIT_MB} MB
            </span>
          </div>
          <Progress value={usagePercent} className="h-2.5" />
          {isOverLimit && (
            <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Storage limit reached.</span>
              <button className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Upgrade plan
              </button>
            </div>
          )}
          {isNearLimit && !isOverLimit && (
            <p className="text-sm text-yellow-600 mt-2">
              You're approaching your storage limit. Consider upgrading for an additional 100 MB.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No documents yet</h3>
            <p className="text-muted-foreground text-sm">
              Documents generated during your consultations will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.template_name && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.template_name}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(new Blob([doc.content]).size / 1024).toFixed(1)} KB
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
