import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import readXlsxFile from "read-excel-file/browser";

type Row = {
  full_name?: string;
  nurse_registration_number?: string;
  email?: string;
  role_title?: string;
  mobile_number?: string;
};

type ResultRow = { full_name: string | null; status: "matched" | "pending" | "error" | "skipped"; reason?: string };

const HEADERS = ["full_name", "nurse_registration_number", "email", "role_title", "mobile_number"] as const;

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === "," && !q) { cells.push(cur); cur = ""; continue; }
      cur += c;
    }
    cells.push(cur);
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] || "").trim(); });
    return row as Row;
  });
}

export function ImportNursesDialog({ hospitalId, onImported }: { hospitalId: string; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [summary, setSummary] = useState<{ matched: number; pending: number; skipped: number; errors: number } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResults(null); setSummary(null);
    try {
      if (f.name.toLowerCase().endsWith(".csv")) {
        const text = await f.text();
        setRows(parseCsv(text));
      } else {
        const raw = await readXlsxFile(f);
        if (!raw.length) { setRows([]); return; }
        const headers = (raw[0] as any[]).map((h) => String(h || "").trim().toLowerCase());
        const parsed: Row[] = raw.slice(1).map((line) => {
          const r: any = {};
          headers.forEach((h, idx) => { r[h] = String((line as any[])[idx] ?? "").trim(); });
          return r as Row;
        });
        setRows(parsed);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not parse file");
    }
  }

  async function submit() {
    if (!rows.length) return;
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const { data, error } = await supabase.functions.invoke("hospital-import-nurses", {
        body: { hospital_id: hospitalId, rows },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      setResults((data as any).results);
      setSummary((data as any).summary);
      toast.success(`Imported: ${(data as any).summary.matched} matched, ${(data as any).summary.pending} pending`);
      onImported();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRows([]); setResults(null); setSummary(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Import nurses</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> Bulk import nurses</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-semibold mb-1">Expected columns ({HEADERS.length})</p>
            <p className="text-muted-foreground">{HEADERS.join(", ")}</p>
            <a href="/templates/hospital-nurses-template.csv" download
               className="inline-flex items-center gap-1 mt-2 text-primary hover:underline">
              <Download className="h-3 w-3" /> Download CSV template
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              Nurses without an existing app account are added as <strong>inactive</strong>.
              They can still be selected on admission records; their Vulas accrue and become claimable once they sign up.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">CSV or XLSX file</label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} />
            {rows.length > 0 && <p className="text-xs text-muted-foreground">{rows.length} row(s) loaded</p>}
          </div>

          {results && summary && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-success">{summary.matched} matched</Badge>
                <Badge variant="secondary">{summary.pending} pending</Badge>
                <Badge variant="outline">{summary.skipped} skipped</Badge>
                {summary.errors > 0 && <Badge variant="destructive">{summary.errors} errors</Badge>}
              </div>
              <div className="max-h-56 overflow-auto rounded-md border divide-y text-xs">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5">
                    <span className="truncate">{r.full_name || <em className="text-muted-foreground">(no name)</em>}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={
                        r.status === "matched" ? "default"
                        : r.status === "pending" ? "secondary"
                        : r.status === "error" ? "destructive" : "outline"
                      } className="text-xs">{r.status}</Badge>
                      {r.reason && <span className="text-muted-foreground">{r.reason}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={!rows.length || busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Import {rows.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
