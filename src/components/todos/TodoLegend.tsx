import { Receipt, Pill, CalendarDays, Award, ArrowUpRight, FlaskConical, FileText, Phone, Mail, Users, CreditCard, Hospital, Bell, AlertTriangle, CheckSquare } from "lucide-react";

const ITEMS = [
  { Icon: Receipt, label: "Invoice" },
  { Icon: Pill, label: "Prescription" },
  { Icon: CalendarDays, label: "Appointment" },
  { Icon: Award, label: "Med. Cert" },
  { Icon: ArrowUpRight, label: "Referral" },
  { Icon: FlaskConical, label: "Lab" },
  { Icon: FileText, label: "Letter" },
  { Icon: Phone, label: "Call/Follow-up" },
  { Icon: Mail, label: "Email" },
  { Icon: Users, label: "Meeting" },
  { Icon: CreditCard, label: "Payment" },
  { Icon: Hospital, label: "Admission" },
  { Icon: Bell, label: "Reminder" },
  { Icon: AlertTriangle, label: "Urgent" },
  { Icon: CheckSquare, label: "Task" },
];

export function TodoLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground border border-neutral-300 rounded-md px-2 py-1.5 bg-muted/30 ${className}`}>
      {ITEMS.map(({ Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3 text-primary" />
          {label}
        </span>
      ))}
    </div>
  );
}
