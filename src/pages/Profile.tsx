import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Search, Plus, MoreVertical, Trash2, Upload, Send } from "lucide-react";
import { ClientDetailsEditor } from "@/components/clients/ClientDetailsEditor";
import { ClientWorkspace } from "@/features/wealth-workflow/workspace/ClientWorkspace";
import { Client, useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientImportDialog } from "@/components/clients/ClientImport";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function AutoCreateClientFallback({ user, onCreated }: { user: any; onCreated: (record: Client) => void }) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      // Re-check right before inserting — another tab/flow (signup, MyDetails'
      // own self-heal) may have created this user's record in the meantime.
      const { data: existing } = await supabase
        .from("clients")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let data = existing;
      if (!data) {
        const { data: profileData } = await supabase.from("profiles").select("full_name, mobile_number").eq("id", user.id).single();
        const { data: inserted, error } = await supabase.from("clients").insert({
          user_id: user.id,
          patient_user_id: user.id,
          name: profileData?.full_name || "My Record",
          email: user.email || null,
          phone: profileData?.mobile_number || null,
        }).select().single();
        // A unique-violation here means a concurrent insert won the race —
        // fall back to fetching the record it created instead of erroring.
        if (error && (error as any).code === "23505") {
          const { data: winner } = await supabase
            .from("clients")
            .select("*")
            .eq("patient_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          data = winner;
        } else if (error) {
          throw error;
        } else {
          data = inserted;
        }
      }
      if (data) {
        onCreated({
          ...data,
          surgeries: [],
          pharmacies: [],
          family_history: [],
          
          next_of_kin_members: [],
          current_medications: [],
        } as unknown as Client);
        toast({ title: "Record created", description: "Your Profile has been initialized." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary bg-card p-8 text-center space-y-4">
      <p className="text-muted-foreground">No advice record found. Create your Profile to start managing your financial information.</p>
      <Button onClick={handleCreate} disabled={creating}>
        {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create My Holarchive"}
      </Button>
    </div>
  );
}

function AdvisorClientsTab() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clients, loading, createClient, deleteClient, fetchClients } = useClients();
  const [searchQuery, setSearchQuery] = useState("");

  const getSurname = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toUpperCase();
  };

  const filteredClients = clients.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients].sort((a, b) =>
      getSurname(a.name).localeCompare(getSurname(b.name))
    );
    if (user?.email) {
      const meIdx = sorted.findIndex(p => p.email?.toLowerCase() === user.email?.toLowerCase());
      if (meIdx > 0) {
        const [me] = sorted.splice(meIdx, 1);
        sorted.unshift(me);
      }
    }
    return sorted;
  }, [filteredClients, user?.email]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientImportDialog
          trigger={
            <Button variant="outline" size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          }
          onImportComplete={() => fetchClients()}
        />
        <Button size="sm" className="gap-1" onClick={() => navigate("/clients")}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
        {sortedClients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No clients found" : "No clients yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Client</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Contact</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-primary-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedClients.map((client) => {
                  const isMe = client.email?.toLowerCase() === user?.email?.toLowerCase();
                  return (
                    <tr key={client.id} className={cn("group transition-colors hover:bg-muted/50", isMe && "bg-muted/30")}>
                      <td className="px-4 py-2.5">
                        <Link to={`/clients/${client.id}`} className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs text-primary-foreground",
                            isMe ? "bg-terracotta" : "bg-primary"
                          )}>
                            {isMe ? "ME" : client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{client.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {client.email || client.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          client.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sessions?client=${client.id}&autoStart=true`)}>
                              Start Consultation
                            </DropdownMenuItem>
                            {!isMe && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete ${client.name}?`)) deleteClient(client.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role } = useUserRole();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [clientRecord, setClientRecord] = useState<Client | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const lastSavedToastRef = useRef<number>(0);

  const isAdvisor = role === "broker";
  const isClientRole = role === "client";

  // Fetch client record for Holarchive
  useEffect(() => {
    if (!user) return;
    const fetchClientRecord = async () => {
      setClientLoading(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("patient_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setClientRecord({
            ...data,
            surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Client["surgeries"] : [],
            pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Client["pharmacies"] : [],
            family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Client["family_history"] : [],
            next_of_kin_members: Array.isArray(data.next_of_kin_members) ? data.next_of_kin_members as unknown as Client["next_of_kin_members"] : [],
            current_medications: Array.isArray(data.current_medications) ? data.current_medications as unknown as Client["current_medications"] : [],
          } as unknown as Client);
        }
      } catch (err) {
        console.error("Error fetching client record:", err);
      } finally {
        setClientLoading(false);
      }
    };
    fetchClientRecord();
  }, [user]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="text-muted-foreground text-xs">Manage your financial information</p>
      </div>

      {clientLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : clientRecord ? (
        <div className="space-y-4">
        <ClientWorkspace clientId={clientRecord.id} />
        <ClientDetailsEditor
          client={clientRecord}
          onSave={async (updates: Partial<Client>) => {
            const { error } = await supabase
              .from("clients")
              .update(updates as any)
              .eq("id", clientRecord.id);
            if (error) {
              toast({ title: "Error saving", description: error.message, variant: "destructive" });
              throw error;
            }
            setClientRecord((prev) => prev ? { ...prev, ...updates } : prev);

            // Autosave fires frequently while typing — only surface a toast
            // every 20s so it doesn't interrupt the user mid-keystroke.
            const now = Date.now();
            if (now - lastSavedToastRef.current > 20000) {
              lastSavedToastRef.current = now;
              toast({ title: "Saved", description: "Your details have been updated." });
            }
          }}
          isSelfService
        />
        </div>
      ) : (
        <AutoCreateClientFallback
          user={user}
          onCreated={(record) => setClientRecord(record)}
        />
      )}
    </div>
  );
}
