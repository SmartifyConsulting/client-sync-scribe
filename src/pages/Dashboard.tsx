import { Users, Calendar } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TodaysBriefing } from "@/components/dashboard/TodaysBriefing";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DoctorAccessRequests } from "@/components/doctor/DoctorAccessRequests";
import { useProfile } from "@/hooks/useProfile";

export default function Dashboard() {
  const { profile } = useProfile();
  const displayName = profile?.full_name || "Doctor";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Good morning, {displayName}</h1>
        <p className="mt-1 text-muted-foreground">
          Here's an overview of your practice today
        </p>
      </div>

      {/* Patient Access Requests */}
      <DoctorAccessRequests />

      {/* Stats Grid - Only essential stats */}
      <div className="grid gap-6 sm:grid-cols-2">
        <StatsCard
          title="Total Patients"
          value={128}
          change="+12 this month"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Appointments Today"
          value={8}
          change="2 completed"
          trend="neutral"
          icon={Calendar}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaysBriefing />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
