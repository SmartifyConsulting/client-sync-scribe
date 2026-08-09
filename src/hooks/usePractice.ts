import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Practice {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeMember {
  id: string;
  practice_id: string;
  doctor_id: string;
  role: string;
  joined_at: string;
  // joined profile info (filled separately)
  full_name?: string | null;
  avatar_url?: string | null;
  practice_color?: string | null;
}

export interface PracticeInvitation {
  id: string;
  practice_id: string;
  invited_email: string;
  invited_by: string;
  invited_role?: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export function usePractice() {
  const { user } = useAuth();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [invitations, setInvitations] = useState<PracticeInvitation[]>([]);
  const [pendingInvites, setPendingInvites] = useState<(PracticeInvitation & { practice_name?: string; inviter_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setPractice(null);
      setMembers([]);
      setInvitations([]);
      setPendingInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Find a practice the user is a member of (any role)
      const { data: memberRows } = await supabase
        .from("practice_members")
        .select("practice_id")
        .eq("doctor_id", user.id)
        .limit(1);

      let practiceId = memberRows?.[0]?.practice_id ?? null;

      // Or the practice they own (in case the owner row in practice_members hasn't been created yet)
      if (!practiceId) {
        const { data: owned } = await supabase
          .from("practices")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (owned) {
          setPractice(owned as Practice);
          practiceId = owned.id;
        }
      }

      if (practiceId) {
        const { data: practiceRow } = await supabase
          .from("practices")
          .select("*")
          .eq("id", practiceId)
          .maybeSingle();
        if (practiceRow) setPractice(practiceRow as Practice);

        const { data: memberRowsFull } = await supabase
          .from("practice_members")
          .select("*")
          .eq("practice_id", practiceId);

        if (memberRowsFull && memberRowsFull.length) {
          const ids = memberRowsFull.map((m: any) => m.doctor_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, practice_color")
            .in("id", ids);
          const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          setMembers(
            memberRowsFull.map((m: any) => ({
              ...m,
              full_name: profMap.get(m.doctor_id)?.full_name ?? null,
              avatar_url: profMap.get(m.doctor_id)?.avatar_url ?? null,
              practice_color: profMap.get(m.doctor_id)?.practice_color ?? null,
            })),
          );
        } else {
          setMembers([]);
        }

        // Owner-visible invitations
        const { data: invs } = await supabase
          .from("practice_invitations")
          .select("*")
          .eq("practice_id", practiceId)
          .order("created_at", { ascending: false });
        setInvitations((invs || []) as PracticeInvitation[]);
      } else {
        setPractice(null);
        setMembers([]);
        setInvitations([]);
      }

      // Pending invites for THIS user (by their email)
      if (user.email) {
        const { data: myInvs } = await supabase
          .from("practice_invitations")
          .select("*")
          .ilike("invited_email", user.email)
          .eq("status", "pending");

        if (myInvs && myInvs.length) {
          const pIds = Array.from(new Set(myInvs.map((i: any) => i.practice_id)));
          const inviterIds = Array.from(new Set(myInvs.map((i: any) => i.invited_by)));
          const [{ data: ps }, { data: ips }] = await Promise.all([
            supabase.from("practices").select("id, name").in("id", pIds),
            supabase.from("profiles").select("id, full_name").in("id", inviterIds),
          ]);
          const pMap = new Map((ps || []).map((p: any) => [p.id, p.name]));
          const iMap = new Map((ips || []).map((p: any) => [p.id, p.full_name]));
          setPendingInvites(
            myInvs.map((i: any) => ({
              ...i,
              practice_name: pMap.get(i.practice_id),
              inviter_name: iMap.get(i.invited_by),
            })),
          );
        } else {
          setPendingInvites([]);
        }
      }
    } catch (err) {
      console.error("usePractice fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createPractice = useCallback(
    async (name: string) => {
      if (!user) return { error: new Error("Not authenticated") };
      const { data, error } = await supabase
        .from("practices")
        .insert({ name, owner_id: user.id })
        .select()
        .single();
      if (error) {
        toast.error("Failed to create practice");
        return { error };
      }
      // Add owner as member
      await supabase
        .from("practice_members")
        .insert({ practice_id: (data as any).id, doctor_id: user.id, role: "owner" });
      toast.success("Practice created");
      await fetchAll();
      return { data };
    },
    [user, fetchAll],
  );

  const inviteMember = useCallback(
    async (email: string, invitedRole: "member" | "assistant" = "member") => {
      if (!user || !practice) return { error: new Error("No practice") };
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { error: new Error("Email required") };
      const { data, error } = await supabase
        .from("practice_invitations")
        .insert({
          practice_id: practice.id,
          invited_email: cleanEmail,
          invited_by: user.id,
          invited_role: invitedRole,
        })
        .select()
        .single();
      if (error) {
        toast.error("Failed to send invitation");
        return { error };
      }
      // Best-effort email notification (re-uses existing invitation email function)
      try {
        await supabase.functions.invoke("send-user-invitation", {
          body: {
            recipientEmail: cleanEmail,
            senderName: "A colleague",
            message: `You have been invited to share a practice calendar on Holarc Health (${practice.name}).`,
            isPracticePartner: true,
            partnerName: cleanEmail,
          },
        });
      } catch {
        /* non-fatal */
      }
      toast.success("Invitation sent");
      await fetchAll();
      return { data };
    },
    [user, practice, fetchAll],
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      const { error } = await supabase
        .from("practice_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) {
        toast.error("Failed to revoke");
        return;
      }
      toast.success("Invitation revoked");
      await fetchAll();
    },
    [fetchAll],
  );

  const acceptInvitation = useCallback(
    async (invitation: PracticeInvitation) => {
      if (!user) return;
      // 1. Add member row
      const { error: memberError } = await supabase
        .from("practice_members")
        .insert({
          practice_id: invitation.practice_id,
          doctor_id: user.id,
          role: (invitation as any).invited_role === "assistant" ? "assistant" : "member",
        });
      if (memberError && memberError.code !== "23505") {
        toast.error("Failed to join practice");
        return;
      }
      // 2. Mark invitation accepted
      await supabase
        .from("practice_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);
      toast.success("Joined practice");
      await fetchAll();
    },
    [user, fetchAll],
  );

  const declineInvitation = useCallback(
    async (invitation: PracticeInvitation) => {
      await supabase
        .from("practice_invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id);
      await fetchAll();
    },
    [fetchAll],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error } = await supabase
        .from("practice_members")
        .delete()
        .eq("id", memberId);
      if (error) {
        toast.error("Failed to remove member");
        return;
      }
      toast.success("Member removed");
      await fetchAll();
    },
    [fetchAll],
  );

  const leavePractice = useCallback(async () => {
    if (!user || !practice) return;
    const { error } = await supabase
      .from("practice_members")
      .delete()
      .eq("practice_id", practice.id)
      .eq("doctor_id", user.id);
    if (error) {
      toast.error("Failed to leave");
      return;
    }
    toast.success("Left practice");
    await fetchAll();
  }, [user, practice, fetchAll]);

  const deletePractice = useCallback(async () => {
    if (!practice) return;
    const { error } = await supabase.from("practices").delete().eq("id", practice.id);
    if (error) {
      toast.error("Failed to delete practice");
      return;
    }
    toast.success("Practice deleted");
    await fetchAll();
  }, [practice, fetchAll]);

  const isOwner = !!(user && practice && practice.owner_id === user.id);

  return {
    practice,
    members,
    invitations,
    pendingInvites,
    loading,
    isOwner,
    refresh: fetchAll,
    createPractice,
    inviteMember,
    revokeInvitation,
    acceptInvitation,
    declineInvitation,
    removeMember,
    leavePractice,
    deletePractice,
  };
}
