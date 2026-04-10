import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, Users, Phone, Mail } from "lucide-react";

interface ListingEntry {
  patientName: string;
  relationship: string;
  phone?: string;
  email?: string;
}

const NokIcedTab = () => {
  const [loading, setLoading] = useState(true);
  const [nokListings, setNokListings] = useState<ListingEntry[]>([]);
  const [iceListings, setIceListings] = useState<ListingEntry[]>([]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) { setLoading(false); return; }

        const userEmail = user.email.toLowerCase();

        // Get all patients that have NOK or ICE data
        const { data: patients, error } = await supabase
          .from("patients")
          .select("name, first_name, last_name, next_of_kin_members, ice_contacts")
          .or("next_of_kin_members.neq.null,ice_contacts.neq.null");

        if (error) { console.error("NOK/ICE query error:", error); setLoading(false); return; }

        const nok: ListingEntry[] = [];
        const ice: ListingEntry[] = [];

        for (const p of patients || []) {
          const patientName = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name;

          // Check next_of_kin_members
          if (Array.isArray(p.next_of_kin_members)) {
            for (const member of p.next_of_kin_members as any[]) {
              if (member?.email?.toLowerCase() === userEmail && member?.shared === true) {
                nok.push({
                  patientName,
                  relationship: member.relationship || "Not specified",
                  phone: member.phone,
                  email: member.email,
                });
              }
            }
          }

          // Check ice_contacts
          if (Array.isArray(p.ice_contacts)) {
            for (const contact of p.ice_contacts as any[]) {
              if (contact?.email?.toLowerCase() === userEmail && contact?.shared === true) {
                ice.push({
                  patientName,
                  relationship: contact.relationship || "Not specified",
                  phone: contact.phone,
                  email: contact.email,
                });
              }
            }
          }
        }

        setNokListings(nok);
        setIceListings(ice);
      } catch (err) {
        console.error("Error fetching NOK/ICE listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = nokListings.length === 0 && iceListings.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-12 space-y-3">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">You are not currently listed as a Next of Kin or ICE contact for anyone.</p>
        <p className="text-xs text-muted-foreground/70">When someone adds you as their NOK or ICE contact, they will appear here.</p>
      </div>
    );
  }

  const renderCard = (entry: ListingEntry, type: "nok" | "ice") => (
    <div key={`${type}-${entry.patientName}-${entry.relationship}`} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
      <p className="text-sm font-medium text-foreground">{entry.patientName}</p>
      <p className="text-xs text-muted-foreground">Relationship: {entry.relationship}</p>
      {entry.phone && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" /> {entry.phone}
        </p>
      )}
      {entry.email && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" /> {entry.email}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {nokListings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Listed as Next of Kin for
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {nokListings.map(e => renderCard(e, "nok"))}
          </div>
        </div>
      )}

      {iceListings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Listed as ICE Contact for
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {iceListings.map(e => renderCard(e, "ice"))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NokIcedTab;
