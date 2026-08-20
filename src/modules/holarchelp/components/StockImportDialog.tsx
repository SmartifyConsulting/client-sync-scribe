import { useState, useCallback } from "react";
// @ts-ignore
import readXlsxFile from "read-excel-file/browser";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Upload, FileSpreadsheet, Check, Loader2, X, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ParsedStockItem {
  item_name: string;
  item_code?: string;
  category?: string;
  unit_of_measure?: string;
  unit_cost?: number;
  reorder_threshold?: number;
  reorder_quantity?: number;
  initial_quantity?: number;
}

const COLUMN_MAPPINGS: Record<string, keyof ParsedStockItem> = {
  "item name": "item_name",
  "item": "item_name",
  "product": "item_name",
  "product name": "item_name",
  "description": "item_name",
  "name": "item_name",

  "code": "item_code",
  "item code": "item_code",
  "sku": "item_code",
  "product code": "item_code",
  "catalogue number": "item_code",
  "catalog number": "item_code",
  "barcode": "item_code",

  "category": "category",
  "type": "category",
  "item type": "category",

  "uom": "unit_of_measure",
  "unit": "unit_of_measure",
  "unit of measure": "unit_of_measure",
  "pack size": "unit_of_measure",
  "packaging": "unit_of_measure",

  "cost": "unit_cost",
  "price": "unit_cost",
  "unit price": "unit_cost",
  "unit cost": "unit_cost",
  "cost price": "unit_cost",

  "reorder level": "reorder_threshold",
  "reorder threshold": "reorder_threshold",
  "min stock": "reorder_threshold",
  "minimum stock": "reorder_threshold",
  "min qty": "reorder_threshold",

  "reorder qty": "reorder_quantity",
  "reorder quantity": "reorder_quantity",
  "order quantity": "reorder_quantity",

  "quantity": "initial_quantity",
  "qty": "initial_quantity",
  "qty on hand": "initial_quantity",
  "stock count": "initial_quantity",
  "stock on hand": "initial_quantity",
  "current stock": "initial_quantity",
};

function mapColumnName(header: string): keyof ParsedStockItem | null {
  return COLUMN_MAPPINGS[header.toLowerCase().trim()] || null;
}

function parseNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return text;
}

interface StockImportProps {
  hospitalId: string;
  onImportComplete?: () => void;
}

function StockImport({ hospitalId, onImportComplete }: StockImportProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const processWithAI = useCallback(async (content: string, fileType: string) => {
    setIsAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-stock-import", {
        body: { content, fileType },
      });

      if (error) throw error;

      if (data?.items && data.items.length > 0) {
        setParsedItems(data.items);
        toast({
          title: "AI Processing Complete",
          description: `Found ${data.items.length} stock item${data.items.length === 1 ? "" : "s"} to import`,
        });
      } else {
        toast({
          title: "No items found",
          description: "AI could not extract any valid stock items from the content",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("AI processing error:", error);
      toast({
        title: "AI Processing Failed",
        description: error.message || "Could not process the file with AI",
        variant: "destructive",
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [toast]);

  const processSpreadsheet = useCallback(async (file: File) => {
    setIsProcessing(true);
    setParsedItems([]);
    setImportResults(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let jsonData: any[][];

      if (extension === "csv") {
        const text = await file.text();
        const lines = text
          .split("\n")
          .map((line) => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          })
          .filter((row) => row.some((cell) => cell !== ""));
        jsonData = lines;
      } else {
        const rows = await readXlsxFile(file);
        jsonData = rows.map((row: any[]) => row.map((cell) => (cell === null ? "" : cell)));
      }

      if (jsonData.length < 2) {
        const textContent = jsonData.map((row) => row.join(",")).join("\n");
        setIsProcessing(false);
        await processWithAI(textContent, "csv");
        return;
      }

      const headers = jsonData[0] as string[];
      const columnMap: Record<number, keyof ParsedStockItem> = {};

      headers.forEach((header, index) => {
        if (header) {
          const mappedField = mapColumnName(String(header));
          if (mappedField) columnMap[index] = mappedField;
        }
      });

      const hasNameColumn = Object.values(columnMap).includes("item_name");

      if (!hasNameColumn) {
        // Column headers didn't match anything known — let AI figure it out
        const textContent = jsonData.map((row) => row.join(",")).join("\n");
        setIsProcessing(false);
        await processWithAI(textContent, "csv");
        return;
      }

      const items: ParsedStockItem[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every((cell) => !cell)) continue;

        const item: ParsedStockItem = { item_name: "" };

        Object.entries(columnMap).forEach(([indexStr, field]) => {
          const index = parseInt(indexStr, 10);
          const value = row[index];
          if (value === undefined || value === null || value === "") return;

          if (["unit_cost", "reorder_threshold", "reorder_quantity", "initial_quantity"].includes(field)) {
            (item as any)[field] = parseNumber(value);
          } else {
            (item as any)[field] = String(value).trim();
          }
        });

        if (item.item_name) items.push(item);
      }

      if (items.length === 0) {
        toast({
          title: "No valid items",
          description: "Could not parse any valid stock items from the file",
          variant: "destructive",
        });
      } else {
        setParsedItems(items);
        toast({
          title: "File processed",
          description: `Found ${items.length} stock item${items.length === 1 ? "" : "s"} to import`,
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error processing file",
        description: "Could not read the spreadsheet. Please check the file format.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  }, [toast, processWithAI]);

  const processFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "pdf") {
        setIsProcessing(true);
        setParsedItems([]);
        setImportResults(null);
        try {
          const text = await extractPdfText(file);
          setIsProcessing(false);
          await processWithAI(text, "pdf");
        } catch (error) {
          console.error("Error reading PDF:", error);
          toast({
            title: "Error reading PDF",
            description: "Could not extract text from the PDF. It may be a scanned image without selectable text.",
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      } else if (extension === "txt") {
        setIsProcessing(true);
        setParsedItems([]);
        setImportResults(null);
        try {
          const content = await file.text();
          setIsProcessing(false);
          await processWithAI(content, "txt");
        } catch (error) {
          console.error("Error reading text file:", error);
          toast({ title: "Error reading file", description: "Could not read the text file", variant: "destructive" });
          setIsProcessing(false);
        }
      } else if (["xlsx", "xls", "csv"].includes(extension || "")) {
        await processSpreadsheet(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel (.xlsx, .xls), CSV, PDF or text file",
          variant: "destructive",
        });
      }
    },
    [toast, processWithAI, processSpreadsheet]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];

      try {
        const { data: inserted, error } = await supabase
          .from("stock_items")
          .insert({
            hospital_id: hospitalId,
            item_name: item.item_name,
            item_code: item.item_code || null,
            category: item.category || "consumable",
            unit_of_measure: item.unit_of_measure || "unit",
            unit_cost: item.unit_cost ?? null,
            reorder_threshold: item.reorder_threshold ?? 10,
            reorder_quantity: item.reorder_quantity ?? 50,
          })
          .select("id")
          .single();

        if (error) throw error;

        if (item.initial_quantity && item.initial_quantity > 0 && inserted) {
          await supabase.from("stock_levels").insert({
            stock_item_id: inserted.id,
            hospital_id: hospitalId,
            location_name: "Central Store",
            quantity_on_hand: item.initial_quantity,
          });
        }

        successCount++;
      } catch (err) {
        console.error("Error importing stock item:", item.item_name, err);
        failedCount++;
      }

      setImportProgress(Math.round(((i + 1) / parsedItems.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} item${successCount === 1 ? "" : "s"}${failedCount > 0 ? `. ${failedCount} failed.` : ""}`,
      });
      onImportComplete?.();
    } else {
      toast({
        title: "Import failed",
        description: "Could not import any items. Please check the data.",
        variant: "destructive",
      });
    }
  };

  const clearData = () => {
    setParsedItems([]);
    setImportResults(null);
    setImportProgress(0);
  };

  const isLoading = isProcessing || isAiProcessing;

  return (
    <div className="space-y-6">
      {parsedItems.length === 0 && (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              {isAiProcessing ? (
                <>
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                  <p className="text-foreground font-medium">AI is analyzing your data...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-muted-foreground">Processing file...</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-4">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">Drag & drop your stock list here</p>
              <p className="text-sm text-muted-foreground mb-2">Supports Excel, CSV, PDF and text files</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI-powered field detection</span>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="stock-import-file"
              />
              <Button variant="outline" onClick={() => document.getElementById("stock-import-file")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </>
          )}
        </div>
      )}

      {parsedItems.length > 0 && !importResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Preview ({parsedItems.length} item{parsedItems.length === 1 ? "" : "s"})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearData}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "400px" }}>
              <Table style={{ minWidth: "1000px" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-card z-10 w-[30px] px-1">#</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[180px] px-1">Item Name</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[90px] px-1">Code</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[100px] px-1">Category</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[80px] px-1">UOM</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[80px] px-1">Cost</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[80px] px-1">Reorder At</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[80px] px-1">Reorder Qty</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 min-w-[80px] px-1">Qty on Hand</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 w-[30px] px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground text-xs px-1">{index + 1}</TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          value={item.item_name}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], item_name: e.target.value };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          value={item.item_code || ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], item_code: e.target.value };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          value={item.category || ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], category: e.target.value };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          value={item.unit_of_measure || ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], unit_of_measure: e.target.value };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          type="number"
                          value={item.unit_cost ?? ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], unit_cost: parseNumber(e.target.value) };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          type="number"
                          value={item.reorder_threshold ?? ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], reorder_threshold: parseNumber(e.target.value) };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          type="number"
                          value={item.reorder_quantity ?? ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], reorder_quantity: parseNumber(e.target.value) };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-7 text-xs px-1.5"
                          type="number"
                          value={item.initial_quantity ?? ""}
                          onChange={(e) => {
                            const updated = [...parsedItems];
                            updated[index] = { ...updated[index], initial_quantity: parseNumber(e.target.value) };
                            setParsedItems(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => setParsedItems(parsedItems.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">Importing... {importProgress}%</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={isImporting} className="gap-2">
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isImporting ? "Importing..." : "Import Stock Items"}
            </Button>
            <Button variant="outline" onClick={clearData} disabled={isImporting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {importResults && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Check className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground">
                {importResults.success} item{importResults.success === 1 ? "" : "s"} imported successfully
                {importResults.failed > 0 && <span className="text-destructive"> · {importResults.failed} failed</span>}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={clearData}>
            Import More Items
          </Button>
        </div>
      )}

      {parsedItems.length === 0 && !isLoading && (
        <div className="p-4 rounded-lg bg-muted/30">
          <p className="text-sm font-medium text-foreground mb-2">Supported Formats</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">.xlsx</Badge>
            <Badge variant="secondary" className="text-xs">.xls</Badge>
            <Badge variant="secondary" className="text-xs">.csv</Badge>
            <Badge variant="secondary" className="text-xs">.pdf</Badge>
            <Badge variant="secondary" className="text-xs">.txt</Badge>
          </div>
          <p className="text-sm font-medium text-foreground mb-2">Auto-detected Fields</p>
          <div className="flex flex-wrap gap-2">
            {["Item Name", "Code/SKU", "Category", "Unit of Measure", "Cost", "Reorder Level", "Reorder Qty", "Qty on Hand"].map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <Sparkles className="h-4 w-4 inline mr-1" />
            AI automatically detects and maps columns from any supplier price list or stock sheet, even PDFs with no standard layout.
          </p>
        </div>
      )}
    </div>
  );
}

interface StockImportDialogProps {
  hospitalId: string;
  trigger: React.ReactNode;
  onImportComplete?: () => void;
}

export function StockImportDialog({ hospitalId, trigger, onImportComplete }: StockImportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleComplete = () => {
    onImportComplete?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Stock Items
          </DialogTitle>
          <DialogDescription>
            Import stock items from spreadsheets, PDFs or supplier price lists using AI-powered field detection
          </DialogDescription>
        </DialogHeader>
        <StockImport hospitalId={hospitalId} onImportComplete={handleComplete} />
      </DialogContent>
    </Dialog>
  );
}
