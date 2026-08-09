import { DocumentsBrowser } from "@/features/documents/components/DocumentsBrowser";
import { WeighInCard } from "./WeighInCard";

interface Props {
  patientId: string;
  patientName?: string;
  /** Doctors and practice assistants maintain the programme and record weigh-ins. */
  canManage: boolean;
  /** The patient themselves viewing their own record. */
  isSelf: boolean;
}

/** Programme documents (exercise programmes and eating plans) plus weigh-ins. */
export function PatientProgrammesTab({ patientId, patientName, canManage }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <DocumentsBrowser
          patientId={patientId}
          patientName={patientName}
          templateFilter={["exercise programme", "eating plan"]}
          emptyLabel="No programmes yet."
        />
      </div>
      <WeighInCard patientId={patientId} canRecord={canManage} />
    </div>
  );
}
