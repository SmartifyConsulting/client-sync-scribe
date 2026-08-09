import { ProgrammePlanner } from "./ProgrammePlanner";
import { WeighInCard } from "./WeighInCard";

interface Props {
  patientId: string;
  /** Doctors and practice assistants build and maintain the programme. */
  canManage: boolean;
  /** The patient themselves ticks adherence and earns Vulas. */
  isSelf: boolean;
}

export function PatientProgrammesTab({ patientId, canManage, isSelf }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <ProgrammePlanner patientId={patientId} canEdit={canManage} canTick={isSelf} />
      </div>
      <WeighInCard patientId={patientId} canRecord={canManage} />
    </div>
  );
}
