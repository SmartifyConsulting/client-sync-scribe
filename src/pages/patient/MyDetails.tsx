import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientDetailsEditor } from "@/components/patients/ClientDetailsEditor";
import { Client } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { EmergencyContact } from "@/features/patients/components/EmergencyContactsSection";




export default function MyDetails({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawReturn = searchParams.get("returnTo");
  const returnTo = rawReturn && rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : null;
  const rawSection = searchParams.get("section");
  const section = embedded ? "workspace" : rawSection === "home" ? "health" : rawSection || "health";
  const [client, setPatient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const { toast } = useToast();
  const lastSavedToastRef = useRef<number>(0);

  useEffect(() => {
    fetchClientRecord();
  }, []);

  const fetchClientRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");
      setUserId(user.id);

      // 1) Prefer a non-archived row linked to this user
      let { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("patient_user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // 2) Fallback: find a non-archived row by email and self-heal the link
      if (!data && user.email) {
        const { data: byEmail } = await supabase
          .from("clients")
          .select("*")
          .ilike("email", user.email)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (byEmail) {
          const { data: healed } = await supabase
            .from("clients")
            .update({ patient_user_id: user.id })
            .eq("id", byEmail.id)
            .select("*")
            .maybeSingle();
          data = healed || byEmail;
        }
      }

      // 3) Self-heal: if still nothing, create a minimal row
      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, mobile_number")
          .eq("id", user.id)
          .maybeSingle();

        const fallbackName =
          profile?.full_name ||
          (user.email ? user.email.split("@")[0] : "New Client");

        const { data: created, error: insertErr } = await supabase
          .from("clients")
          .insert({
            user_id: user.id,
            patient_user_id: user.id,
            name: fallbackName,
            email: user.email || null,
            phone: profile?.mobile_number || null,
          })
          .select("*")
          .single();

        if (insertErr) {
          // A unique-violation means a concurrent flow (another tab, the
          // signup insert, Profile.tsx's fallback) already created this
          // user's record — fetch it instead of surfacing an error.
          if ((insertErr as any).code === "23505") {
            const { data: winner } = await supabase
              .from("clients")
              .select("*")
              .eq("patient_user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            data = winner;
          } else {
            toast({
              title: t("client.myDetails.errorInitializeTitle"),
              description: insertErr.message,
              variant: "destructive",
            });
            return;
          }
        } else {
          data = created;
        }
      }

      if (data) {
        setPatient({
          ...data,
          surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Client["surgeries"] : [],
          pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Client["pharmacies"] : [],
          family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Client["family_history"] : [],
          next_of_kin_members: Array.isArray(data.next_of_kin_members) ? data.next_of_kin_members as unknown as Client["next_of_kin_members"] : [],
          current_medications: Array.isArray(data.current_medications) ? data.current_medications as unknown as Client["current_medications"] : [],
        } as unknown as Client);
        const ec = (data as any).emergency_contacts;
        setEmergencyContacts(Array.isArray(ec) ? ec : []);
      }
    } catch (err) {
      console.error("Error fetching client record:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<Client>) => {
    if (!client) return;
    const { error } = await supabase
      .from("clients")
      .update(updates as any)
      .eq("id", client.id);

    if (error) {
      toast({ title: t("client.myDetails.errorSaveTitle"), description: error.message, variant: "destructive" });
      throw error;
    }

    setPatient((prev) => prev ? { ...prev, ...updates } : prev);

    // Autosave fires frequently while typing — only surface a toast every
    // 20s so it doesn't interrupt the user mid-keystroke.
    const now = Date.now();
    if (now - lastSavedToastRef.current > 20000) {
      lastSavedToastRef.current = now;
      toast({ title: t("common.saved"), description: t("client.myDetails.detailsUpdated") });
    }
  };

  const isIncomplete = useMemo(() => {
    if (!client) return true;
    const p: any = client;
    return (
      !p.dob ||
      !p.physical_address ||
      !p.phone ||
      (!(emergencyContacts && emergencyContacts.length > 0) && !p.next_of_kin_name)
    );
  }, [client, emergencyContacts]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!embedded && rawSection === "home") {
    return <Navigate to="/client/details?section=health" replace />;
  }


  const sectionHeading: Record<string, { title: string; subtitle: string }> = {
    health: { title: t("client.myDetails.myHolarchy", "My Profile"), subtitle: t("client.myDetails.holarchySubtitle", "Your personal and financial details, advisers and consultation history") },
    admin: { title: t("client.myDetails.myDesk", "My Desk"), subtitle: t("client.myDetails.deskSubtitle", "Calendar, actions and documents") },
    rewards: { title: t("client.myDetails.myRewards", "My Rewards"), subtitle: t("client.myDetails.rewardsSubtitle", "Track your Vulas and rewards") },
  };
  const heading = sectionHeading[section] || sectionHeading.health;

  return (
    <div className={embedded ? "space-y-3" : "space-y-4 p-4 md:p-6"}>
      {embedded && <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">My Profile</p>}
      {!embedded && <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{heading.title}</h1>
          <p className="text-muted-foreground text-xs">{heading.subtitle}</p>
        </div>
        {returnTo && (
          <button
            onClick={() => navigate(returnTo)}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Saved — back to Live Workspace
          </button>
        )}
      </div>}

      {client ? (
        <ClientDetailsEditor
          client={client}
          onSave={handleSave}
          isSelfService
          userEmail={userEmail}
          userId={userId}
          emergencyContacts={emergencyContacts}
          onEmergencyContactsChange={setEmergencyContacts}
          section={section}
        />
      ) : (
        <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
          <p>{t("client.myDetails.recordSetupMessage")}</p>
        </div>
      )}
    </div>
  );
}
