import { NewClientInvite } from "@/features/wealth-workflow/invites/NewClientInvite";
import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { TodaysBriefing } from "@/components/dashboard/TodaysBriefing";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { ActiveWorkspaceClients } from "@/components/dashboard/ActiveWorkspaceClients";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
import { EarningsThisMonth } from "@/components/dashboard/EarningsThisMonth";
import { useProfile } from "@/hooks/useProfile";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { useGenerateWmActionItems } from "@/hooks/useGenerateWmActionItems";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const { isAdvisor, isClient, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  useGenerateWmActionItems();
  // Today's Briefing stays half the height of the Live Workspaces frame, tracking it as it grows.
  const liveRef = useRef<HTMLDivElement>(null);
  const [briefingHeight, setBriefingHeight] = useState(0);
  useEffect(() => {
    const el = liveRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBriefingHeight(Math.max(160, Math.round(el.offsetHeight / 2))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shouldRedirectPatient = !roleLoading && isClient;

  const displayName = (() => {
    if (profileLoading || roleLoading) return '';
    if (!profile?.full_name) return isAdvisor ? 'Wealth Manager' : '';
    const nameParts = profile.full_name.split(' ');
    const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    return `${nameParts[0]} ${surname !== nameParts[0] ? surname : ''}`.trim();
  })();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("doctorDashboard.greetingMorning") : hour < 18 ? t("doctorDashboard.greetingAfternoon") : t("doctorDashboard.greetingEvening");

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  if (shouldRedirectPatient) {
    return <Navigate to="/client/details" replace />;
  }

  const doctorIncomplete = isAdvisor && profile && (
    !(profile as any).specialty ||
    !(profile as any).practice_number ||
    !(profile as any).doctor_number ||
    !(profile as any).practice_address
  );

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="pb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-2 text-muted-foreground text-xs">
            {t("doctorDashboard.subtitle")}
            <span className="block md:inline"> {formattedDate}</span>
          </p>
        </div>
        {isAdvisor && <div className="pt-3 md:pt-4"><NewClientInvite /></div>}
      </div>

      {doctorIncomplete && (
        <ProfileCompletionBanner
          title="Complete your wealth manager profile"
          message="Complete your firm details on My Business so your clients' documents fill in correctly. Your details are encrypted and visible only to you and your clients."
          onComplete={() => navigate("/profile")}
          storageKey="holarc_doctor_profile_banner_dismissed"
        />
      )}

      <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2 items-start">
        <div ref={liveRef}><ActiveWorkspaceClients /></div>
        <div className="flex flex-col gap-3 md:gap-6">
          <div className="overflow-y-auto rounded-xl" style={briefingHeight ? { maxHeight: briefingHeight } : undefined}>
            <TodaysBriefing />
          </div>
          <UpcomingMeetings />
          <PipelineOverview />
          <EarningsThisMonth />
        </div>
      </div>
    </div>
  );
}
