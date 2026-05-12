import { DoctorRoundTables } from "@/components/doctor/DoctorRoundTables";

export default function DoctorRoundTablesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-[12px] font-semibold text-foreground">My Round Tables</h1>
      <DoctorRoundTables />
    </div>
  );
}
