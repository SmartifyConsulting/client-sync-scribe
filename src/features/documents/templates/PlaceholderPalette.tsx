import { GripHorizontal } from "lucide-react";

export interface PlaceholderItem {
  token: string;
  category: "patient" | "doctor" | "practice" | "document";
  label: string;
}

const PLACEHOLDERS: PlaceholderItem[] = [
  // Patient data
  { token: "[PatientName]", category: "patient", label: "Patient Name" },
  { token: "[PatientAddress]", category: "patient", label: "Patient Address" },
  { token: "[PatientDOB]", category: "patient", label: "Patient DOB" },

  // Doctor data
  { token: "[DoctorName]", category: "doctor", label: "Doctor Name" },
  { token: "[DoctorSignature]", category: "doctor", label: "Doctor Signature" },
  { token: "[DoctorNumber]", category: "doctor", label: "Doctor Number" },

  // Practice data
  { token: "[PracticeNumber]", category: "practice", label: "Practice Number" },
  { token: "[PracticeAddress]", category: "practice", label: "Practice Address" },

  // Document data
  { token: "[Date]", category: "document", label: "Date" },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  patient: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-700 dark:text-blue-300",
  },
  doctor: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900",
    text: "text-green-700 dark:text-green-300",
  },
  practice: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-900",
    text: "text-purple-700 dark:text-purple-300",
  },
  document: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  patient: "ðŸ‘¤ Patient Information",
  doctor: "ðŸ‘¨â€âš•ï¸ Doctor Information",
  practice: "ðŸ¥ Practice Information",
  document: "ðŸ“„ Document Information",
};

interface PlaceholderPaletteProps {
  onDragStart?: (e: React.DragEvent, token: string) => void;
  onCopy?: (token: string) => void;
}

export function PlaceholderPalette({ onDragStart, onCopy }: PlaceholderPaletteProps) {
  const handleDragStart = (e: React.DragEvent, token: string) => {
    e.dataTransfer.setData("text/plain", token);
    e.dataTransfer.effectAllowed = "copy";
    if (onDragStart) onDragStart(e, token);
  };

  const handleCopy = (token: string) => {
    navigator.clipboard?.writeText(token).then(() => {
      if (onCopy) onCopy(token);
    });
  };

  const categories = Object.keys(CATEGORY_LABELS) as Array<
    "patient" | "doctor" | "practice" | "document"
  >;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = PLACEHOLDERS.filter((p) => p.category === category);
        const colors = CATEGORY_COLORS[category];

        return (
          <div key={category}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <div
                  key={item.token}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.token)}
                  onClick={() => handleCopy(item.token)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded border cursor-grab active:cursor-grabbing
                    transition-colors hover:shadow-sm
                    ${colors.bg} ${colors.border} ${colors.text}
                  `}
                  title={`Drag into content, or click to copy: ${item.token}`}
                >
                  <GripHorizontal className="h-3 w-3 opacity-50 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-[10px] opacity-60 font-mono truncate">
                      {item.token}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
        <p className="text-sm text-muted-foreground">
          ðŸ’¡ <strong>Tip:</strong> Drag any placeholder into your template content. They'll
          automatically fill with real data when documents are created.
        </p>
      </div>
    </div>
  );
}

