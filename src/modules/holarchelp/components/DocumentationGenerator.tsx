import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Copy, Download, Loader2 } from "lucide-react";

interface DocumentationGeneratorProps {
  patientUserId: string | null;
  incidentId?: string | null;
  className?: string;
}

export function DocumentationGenerator({
  patientUserId,
  incidentId,
  className,
}: DocumentationGeneratorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!patientUserId || !incidentId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: templateData } = await supabase
          .from("incident_report_templates")
          .select("*");
        setTemplates(templateData || []);

        const { data: suggestionData } = await supabase.rpc(
          "generate_documentation_suggestions",
          {
            p_patient_user_id: patientUserId,
            p_incident_id: incidentId,
          }
        );
        setSuggestions(suggestionData || []);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientUserId, incidentId]);

  const handleGenerateReport = async (templateId: string) => {
    if (!user?.id || !incidentId || !patientUserId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc("generate_incident_report", {
        p_incident_id: incidentId,
        p_patient_user_id: patientUserId,
        p_template_id: templateId,
        p_generated_by: user.id,
      });

      if (!error) {
        const { data: report } = await supabase
          .from("incident_generated_reports")
          .select("report_content")
          .eq("id", data)
          .single();

        setGeneratedReport(report?.report_content || "");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (!patientUserId || !incidentId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No incident selected
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Critical Suggestions */}
      {suggestions.some((s) => s.priority === "critical") && (
        <Alert className="border-destructive/50 bg-destructive/10 mb-4">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Critical Documentation Items</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            {suggestions
              .filter((s) => s.priority === "critical")
              .map((s) => (
                <p key={s.id} className="text-xs">
                  • {s.suggestion_text}
                </p>
              ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Report Templates */}
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.template_name}
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  {template.template_sections.length} sections
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {template.auto_fill_fields.map((field: string) => (
                    <Badge key={field} variant="outline" className="text-[10px]">
                      ✓ {field} (auto-filled)
                    </Badge>
                  ))}
                </div>

                <Button
                  onClick={() => handleGenerateReport(template.id)}
                  disabled={generating}
                  className="w-full"
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-3 w-3" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generated Report Preview */}
      {generatedReport && (
        <Card className="mt-4 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generated Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-white dark:bg-slate-950 p-4 rounded border text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
              {generatedReport}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(generatedReport)}
              >
                <Copy className="mr-2 h-3 w-3" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const element = document.createElement("a");
                  element.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8," + encodeURIComponent(generatedReport)
                  );
                  element.setAttribute("download", "incident_report.txt");
                  element.style.display = "none";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                <Download className="mr-2 h-3 w-3" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
