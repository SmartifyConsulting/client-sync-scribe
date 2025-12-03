import { Users, Calendar, FileText, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Good morning, Dr. Smith</h1>
        <p className="mt-1 text-muted-foreground">
          Here's an overview of your practice today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
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
        <StatsCard
          title="Documents Generated"
          value={24}
          change="+8 this week"
          trend="up"
          icon={FileText}
        />
        <StatsCard
          title="Session Hours"
          value="32h"
          change="+15% vs last week"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingAppointments />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
