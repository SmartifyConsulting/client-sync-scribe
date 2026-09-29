import { useState, useRef } from "react";
import { Loader2, Plus, Pencil, Trash2, Save, X, Gift, Flame, Calendar, Globe, Upload, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useGamificationAdmin, useStreakAdmin, GamificationConfig, StreakConfig } from "@/hooks/usePatientRewards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import vulaSymbol from "@/assets/vula-symbol.png";
import { AdminPage } from "@/pages/admin/_shared/AdminPage";
import { adminTabsListClass, adminTabsTriggerClass } from "@/pages/admin/_shared/AdminTabs";

interface PartnerApp {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  creator: string | null;
  signup_url: string | null;
  google_play_url: string | null;
  app_store_url: string | null;
}

interface AdherenceConfig {
  id: string;
  medication_category: string;
  lollipops_awarded: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GamificationAdmin() {
  const { configs, loading, updateConfig, createConfig, deleteConfig } = useGamificationAdmin();
  const { streakConfigs, loading: streaksLoading, updateStreakConfig, createStreakConfig, deleteStreakConfig } = useStreakAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<GamificationConfig>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    visit_category: "",
    lollipops_awarded: 1,
    description: "",
    is_active: true,
  });

  // Streak state
  const [editingStreakId, setEditingStreakId] = useState<string | null>(null);
  const [editStreakValues, setEditStreakValues] = useState<Partial<StreakConfig>>({});
  const [showAddStreakDialog, setShowAddStreakDialog] = useState(false);
  const [newStreakConfig, setNewStreakConfig] = useState({
    streak_name: "",
    visit_category: "",
    streak_interval_months: 12,
    lollipops_awarded: 3,
    description: "",
    is_active: true,
  });

  // Partner Apps state
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddAppDialog, setShowAddAppDialog] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppLogoFile, setNewAppLogoFile] = useState<File | null>(null);
  const [newAppCreator, setNewAppCreator] = useState("");
  const [newAppSignupUrl, setNewAppSignupUrl] = useState("");
  const [newAppGooglePlayUrl, setNewAppGooglePlayUrl] = useState("");
  const [newAppStoreUrl, setNewAppStoreUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editAppValues, setEditAppValues] = useState<Partial<PartnerApp>>({});

  // Adherence Rewards state
  const [showAddAdherenceDialog, setShowAddAdherenceDialog] = useState(false);
  const [newAdherenceConfig, setNewAdherenceConfig] = useState({
    medication_category: "",
    lollipops_awarded: 1,
    description: "",
    is_active: true,
  });
  const [editingAdherenceId, setEditingAdherenceId] = useState<string | null>(null);
  const [editAdherenceValues, setEditAdherenceValues] = useState<Partial<AdherenceConfig>>({});

  const { data: partnerApps = [], isLoading: appsLoading } = useQuery({
    queryKey: ["admin-partner-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vula_partner_apps")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PartnerApp[];
    },
  });

  const { data: adherenceConfigs = [], isLoading: adherenceLoading } = useQuery({
    queryKey: ["admin-adherence-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vula_adherence_configs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdherenceConfig[];
    },
  });

  const addAppMutation = useMutation({
    mutationFn: async () => {
      setUploadingLogo(true);
      let logoUrl: string | null = null;
      
      if (newAppLogoFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const ext = newAppLogoFile.name.split(".").pop() || "png";
        const fileName = `${user.id}/partner-apps/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(fileName, newAppLogoFile, { contentType: newAppLogoFile.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("vula_partner_apps")
        .insert({
          name: newAppName,
          logo_url: logoUrl,
          creator: newAppCreator || null,
          signup_url: newAppSignupUrl || null,
          google_play_url: newAppGooglePlayUrl || null,
          app_store_url: newAppStoreUrl || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-apps"] });
      setShowAddAppDialog(false);
      setNewAppName("");
      setNewAppLogoFile(null);
      setNewAppCreator("");
      setNewAppSignupUrl("");
      setNewAppGooglePlayUrl("");
      setNewAppStoreUrl("");
      setUploadingLogo(false);
      toast({ title: "Partner app added" });
    },
    onError: (err: Error) => {
      setUploadingLogo(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateAppMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PartnerApp> }) => {
      const { error } = await supabase
        .from("vula_partner_apps")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-apps"] });
      setEditingAppId(null);
      setEditAppValues({});
      toast({ title: "Partner app updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleAppMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vula_partner_apps")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-apps"] });
    },
  });

  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vula_partner_apps")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-apps"] });
      toast({ title: "Partner app removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Adherence config mutations
  const addAdherenceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vula_adherence_configs")
        .insert({
          medication_category: newAdherenceConfig.medication_category,
          lollipops_awarded: newAdherenceConfig.lollipops_awarded,
          description: newAdherenceConfig.description || null,
          is_active: newAdherenceConfig.is_active,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adherence-configs"] });
      setShowAddAdherenceDialog(false);
      setNewAdherenceConfig({ medication_category: "", lollipops_awarded: 1, description: "", is_active: true });
      toast({ title: "Adherence reward added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateAdherenceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdherenceConfig> }) => {
      const { error } = await supabase
        .from("vula_adherence_configs")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adherence-configs"] });
      setEditingAdherenceId(null);
      setEditAdherenceValues({});
      toast({ title: "Adherence reward updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteAdherenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vula_adherence_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adherence-configs"] });
      toast({ title: "Adherence reward removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleAdherenceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vula_adherence_configs")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adherence-configs"] });
    },
  });

  const handleEdit = (config: GamificationConfig) => {
    setEditingId(config.id);
    setEditValues({
      lollipops_awarded: config.lollipops_awarded,
      description: config.description,
      is_active: config.is_active,
    });
  };

  const handleSave = async (id: string) => {
    await updateConfig(id, editValues);
    setEditingId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleAdd = async () => {
    const category = newConfig.visit_category.trim().toLowerCase().replace(/\s+/g, "_");
    if (!category) {
      toast({ title: "Category required", description: "Enter a unique category name.", variant: "destructive" });
      return;
    }
    if (configs.some((c) => c.visit_category.toLowerCase() === category)) {
      toast({ title: "Duplicate category", description: `"${category}" already exists.`, variant: "destructive" });
      return;
    }
    const created = await createConfig({ ...newConfig, visit_category: category } as any);
    if (!created) return;
    setShowAddDialog(false);
    setNewConfig({
      visit_category: "",
      lollipops_awarded: 1,
      description: "",
      is_active: true,
    });
  };

  const handleToggleActive = async (config: GamificationConfig) => {
    await updateConfig(config.id, { is_active: !config.is_active });
  };

  // Streak handlers
  const handleEditStreak = (config: StreakConfig) => {
    setEditingStreakId(config.id);
    setEditStreakValues({
      lollipops_awarded: config.lollipops_awarded,
      streak_interval_months: config.streak_interval_months,
      description: config.description,
      is_active: config.is_active,
    });
  };

  const handleSaveStreak = async (id: string) => {
    await updateStreakConfig(id, editStreakValues);
    setEditingStreakId(null);
    setEditStreakValues({});
  };

  const handleCancelStreak = () => {
    setEditingStreakId(null);
    setEditStreakValues({});
  };

  const handleAddStreak = async () => {
    if (!newStreakConfig.streak_name || !newStreakConfig.visit_category) return;
    
    await createStreakConfig(newStreakConfig as any);
    setShowAddStreakDialog(false);
    setNewStreakConfig({
      streak_name: "",
      visit_category: "",
      streak_interval_months: 12,
      lollipops_awarded: 3,
      description: "",
      is_active: true,
    });
  };

  const handleToggleStreakActive = async (config: StreakConfig) => {
    await updateStreakConfig(config.id, { is_active: !config.is_active });
  };

  if (loading || streaksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminPage
      eyebrow="Admin"
      title="Reward Admin"
      description="Configure Vula rewards, adherence bonuses, streak programs, and partner apps."
    >
      {/* Stats */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Visit categories", value: configs.length, tone: "text-[hsl(var(--admin-text-primary))]" },
          { label: "Active categories", value: configs.filter(c => c.is_active).length, tone: "text-[hsl(var(--admin-status-active))]" },
          { label: "Streak programs", value: streakConfigs.length, tone: "text-[hsl(var(--admin-status-pending))]" },
          { label: "Max Vulas / visit", value: Math.max(...configs.map(c => c.lollipops_awarded), 0), tone: "text-[hsl(var(--admin-accent))]", showVula: true },
        ].map((s) => (
          <div key={s.label} className="admin-panel px-4 py-3">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-[hsl(var(--admin-text-tertiary))]">{s.label}</p>
            <p className={`mt-1 text-[20px] font-semibold tabular-nums flex items-center gap-1.5 ${s.tone}`}>
              {s.value}
              {s.showVula && <img src={vulaSymbol} alt="Vula" className="h-4 w-4 object-contain" />}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="rewards">
        <TabsList className={adminTabsListClass}>
          <TabsTrigger value="rewards" className={`${adminTabsTriggerClass} gap-1.5`}>
            <Gift className="h-3.5 w-3.5" />Visit Rewards
          </TabsTrigger>
          <TabsTrigger value="adherence" className={`${adminTabsTriggerClass} gap-1.5`}>
            <Pill className="h-3.5 w-3.5" />Adherence Rewards
          </TabsTrigger>
          <TabsTrigger value="streaks" className={`${adminTabsTriggerClass} gap-1.5`}>
            <Flame className="h-3.5 w-3.5" />Streak Programs
          </TabsTrigger>
          <TabsTrigger value="partner-apps" className={`${adminTabsTriggerClass} gap-1.5`}>
            <Globe className="h-3.5 w-3.5" />Partner Apps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          {/* Rewards Config Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-slate-500" />
                  Reward Categories
                </CardTitle>
                <CardDescription>
                  Configure how many Vulas patients earn for each type of visit
                </CardDescription>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Reward Category</DialogTitle>
                    <DialogDescription>
                      Create a new visit type that awards Vulas to patients
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Visit Category Name</Label>
                      <Input
                        placeholder="e.g., dental_checkup"
                        value={newConfig.visit_category}
                        onChange={(e) => setNewConfig({ ...newConfig, visit_category: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Must be unique. Spaces become underscores.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Vulas Awarded</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newConfig.lollipops_awarded}
                        onChange={(e) => setNewConfig({ ...newConfig, lollipops_awarded: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description of this visit type..."
                        value={newConfig.description}
                        onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={!newConfig.visit_category}>Add Category</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit Category</TableHead>
                     <TableHead>Vulas</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.visit_category}
                      </TableCell>
                      <TableCell>
                        {editingId === config.id ? (
                          <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={editValues.lollipops_awarded}
                            onChange={(e) => setEditValues({ ...editValues, lollipops_awarded: parseInt(e.target.value) || 1 })}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            {config.lollipops_awarded} <img src={vulaSymbol} alt="Vula" className="h-4 w-4 inline object-contain" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {editingId === config.id ? (
                          <Input
                            value={editValues.description || ""}
                            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                            placeholder="Description..."
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {config.description || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={editingId === config.id ? editValues.is_active : config.is_active}
                          onCheckedChange={(checked) => {
                            if (editingId === config.id) {
                              setEditValues({ ...editValues, is_active: checked });
                            } else {
                              handleToggleActive(config);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === config.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleSave(config.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(config)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adherence Rewards Tab */}
        <TabsContent value="adherence" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-500" />
                  Adherence Reward Categories
                </CardTitle>
                <CardDescription>
                  Configure Vula rewards for verified medication adherence
                </CardDescription>
              </div>
              <Dialog open={showAddAdherenceDialog} onOpenChange={setShowAddAdherenceDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Adherence Reward</DialogTitle>
                    <DialogDescription>
                      Create a new medication category that awards Vulas for verified doses
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Medication Category</Label>
                      <Input
                        placeholder="e.g., Blood Pressure, Diabetes, Chronic"
                        value={newAdherenceConfig.medication_category}
                        onChange={(e) => setNewAdherenceConfig({ ...newAdherenceConfig, medication_category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vulas per Verified Dose</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newAdherenceConfig.lollipops_awarded}
                        onChange={(e) => setNewAdherenceConfig({ ...newAdherenceConfig, lollipops_awarded: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description..."
                        value={newAdherenceConfig.description}
                        onChange={(e) => setNewAdherenceConfig({ ...newAdherenceConfig, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddAdherenceDialog(false)}>Cancel</Button>
                    <Button onClick={() => addAdherenceMutation.mutate()} disabled={!newAdherenceConfig.medication_category.trim() || addAdherenceMutation.isPending}>
                      Add Category
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {adherenceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : adherenceConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No adherence reward categories yet. Add one to reward patients for taking their medication.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication Category</TableHead>
                      <TableHead>Vulas/Dose</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adherenceConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {editingAdherenceId === config.id ? (
                            <Input value={editAdherenceValues.medication_category || ""} onChange={(e) => setEditAdherenceValues({ ...editAdherenceValues, medication_category: e.target.value })} className="w-40" />
                          ) : config.medication_category}
                        </TableCell>
                        <TableCell>
                          {editingAdherenceId === config.id ? (
                            <Input type="number" min={1} className="w-20" value={editAdherenceValues.lollipops_awarded} onChange={(e) => setEditAdherenceValues({ ...editAdherenceValues, lollipops_awarded: parseInt(e.target.value) || 1 })} />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              {config.lollipops_awarded} <img src={vulaSymbol} alt="Vula" className="h-4 w-4 inline object-contain" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {editingAdherenceId === config.id ? (
                            <Input value={editAdherenceValues.description || ""} onChange={(e) => setEditAdherenceValues({ ...editAdherenceValues, description: e.target.value })} placeholder="Description..." />
                          ) : (
                            <span className="text-muted-foreground text-sm">{config.description || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editingAdherenceId === config.id ? editAdherenceValues.is_active : config.is_active}
                            onCheckedChange={(checked) => {
                              if (editingAdherenceId === config.id) {
                                setEditAdherenceValues({ ...editAdherenceValues, is_active: checked });
                              } else {
                                toggleAdherenceMutation.mutate({ id: config.id, is_active: !config.is_active });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {editingAdherenceId === config.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingAdherenceId(null); setEditAdherenceValues({}); }}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={() => updateAdherenceMutation.mutate({ id: config.id, updates: editAdherenceValues })}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingAdherenceId(config.id); setEditAdherenceValues({ medication_category: config.medication_category, lollipops_awarded: config.lollipops_awarded, description: config.description, is_active: config.is_active }); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteAdherenceMutation.mutate(config.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          {/* Streaks Config Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Streak Programs
                </CardTitle>
                <CardDescription>
                  Configure streak rewards for regular preventive visits (e.g., annual mammogram)
                </CardDescription>
              </div>
              <Dialog open={showAddStreakDialog} onOpenChange={setShowAddStreakDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Streak
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Streak Program</DialogTitle>
                    <DialogDescription>
                      Create a streak reward for recurring preventive visits
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Streak Name</Label>
                      <Input
                        placeholder="e.g., Annual Mammogram"
                        value={newStreakConfig.streak_name}
                        onChange={(e) => setNewStreakConfig({ ...newStreakConfig, streak_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Visit Category (must match reward category)</Label>
                      <Input
                        placeholder="e.g., Mammogram"
                        value={newStreakConfig.visit_category}
                        onChange={(e) => setNewStreakConfig({ ...newStreakConfig, visit_category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interval (months)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newStreakConfig.streak_interval_months}
                        onChange={(e) => setNewStreakConfig({ ...newStreakConfig, streak_interval_months: parseInt(e.target.value) || 12 })}
                      />
                      <p className="text-xs text-muted-foreground">How often must this visit be completed to maintain streak</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus Vulas per Streak</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newStreakConfig.lollipops_awarded}
                        onChange={(e) => setNewStreakConfig({ ...newStreakConfig, lollipops_awarded: parseInt(e.target.value) || 3 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description..."
                        value={newStreakConfig.description}
                        onChange={(e) => setNewStreakConfig({ ...newStreakConfig, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddStreakDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddStreak} disabled={!newStreakConfig.streak_name || !newStreakConfig.visit_category}>
                      Add Streak
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Streak Name</TableHead>
                    <TableHead>Visit Category</TableHead>
                    <TableHead>Interval</TableHead>
                     <TableHead>Vulas</TableHead>
                     <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streakConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.streak_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{config.visit_category}</span>
                      </TableCell>
                      <TableCell>
                        {editingStreakId === config.id ? (
                          <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={editStreakValues.streak_interval_months}
                            onChange={(e) => setEditStreakValues({ ...editStreakValues, streak_interval_months: parseInt(e.target.value) || 12 })}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {config.streak_interval_months} months
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingStreakId === config.id ? (
                          <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={editStreakValues.lollipops_awarded}
                            onChange={(e) => setEditStreakValues({ ...editStreakValues, lollipops_awarded: parseInt(e.target.value) || 1 })}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            {config.lollipops_awarded} <img src={vulaSymbol} alt="Vula" className="h-4 w-4 inline object-contain" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={editingStreakId === config.id ? editStreakValues.is_active : config.is_active}
                          onCheckedChange={(checked) => {
                            if (editingStreakId === config.id) {
                              setEditStreakValues({ ...editStreakValues, is_active: checked });
                            } else {
                              handleToggleStreakActive(config);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {editingStreakId === config.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={handleCancelStreak}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleSaveStreak(config.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditStreak(config)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteStreakConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partner-apps" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Partner Apps
                </CardTitle>
                <CardDescription>
                  Manage external apps that accept Vula transfers from patients
                </CardDescription>
              </div>
              <Dialog open={showAddAppDialog} onOpenChange={setShowAddAppDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add App
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Partner App</DialogTitle>
                    <DialogDescription>
                      Add an external app that can receive Vula transfers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>App Name</Label>
                      <Input
                        placeholder="e.g., HealthStore"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                          {newAppLogoFile ? newAppLogoFile.name : "Upload Logo"}
                        </Button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => setNewAppLogoFile(e.target.files?.[0] || null)}
                        />
                        {newAppLogoFile && (
                          <img src={URL.createObjectURL(newAppLogoFile)} alt="Preview" className="h-8 w-8 rounded-lg object-contain" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Creator</Label>
                      <Input
                        placeholder="e.g., Health Corp"
                        value={newAppCreator}
                        onChange={(e) => setNewAppCreator(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Signup URL</Label>
                      <Input
                        placeholder="https://app.example.com/signup"
                        value={newAppSignupUrl}
                        onChange={(e) => setNewAppSignupUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Google Play Store URL</Label>
                      <Input
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        value={newAppGooglePlayUrl}
                        onChange={(e) => setNewAppGooglePlayUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>App Store URL (iOS)</Label>
                      <Input
                        placeholder="https://apps.apple.com/app/..."
                        value={newAppStoreUrl}
                        onChange={(e) => setNewAppStoreUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddAppDialog(false)}>Cancel</Button>
                    <Button onClick={() => addAppMutation.mutate()} disabled={!newAppName.trim() || addAppMutation.isPending}>
                      Add App
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : partnerApps.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No partner apps yet. Add one to enable Vula transfers.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>App Name</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Signup Link</TableHead>
                      <TableHead>Install Links</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerApps.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          {app.logo_url ? (
                            <img src={app.logo_url} alt={app.name} className="h-8 w-8 rounded-lg object-contain" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Globe className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {editingAppId === app.id ? (
                            <Input value={editAppValues.name || ""} onChange={(e) => setEditAppValues({ ...editAppValues, name: e.target.value })} className="w-32" />
                          ) : app.name}
                        </TableCell>
                        <TableCell>
                          {editingAppId === app.id ? (
                            <Input value={editAppValues.creator || ""} onChange={(e) => setEditAppValues({ ...editAppValues, creator: e.target.value })} className="w-28" placeholder="Creator" />
                          ) : (
                            <span className="text-sm text-muted-foreground">{app.creator || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingAppId === app.id ? (
                            <Input value={editAppValues.signup_url || ""} onChange={(e) => setEditAppValues({ ...editAppValues, signup_url: e.target.value })} className="w-40" placeholder="Signup URL" />
                          ) : app.signup_url ? (
                            <a href={app.signup_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:text-primary/80">Sign up</a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingAppId === app.id ? (
                            <div className="space-y-1">
                              <Input value={editAppValues.google_play_url || ""} onChange={(e) => setEditAppValues({ ...editAppValues, google_play_url: e.target.value })} className="w-40" placeholder="Google Play URL" />
                              <Input value={editAppValues.app_store_url || ""} onChange={(e) => setEditAppValues({ ...editAppValues, app_store_url: e.target.value })} className="w-40" placeholder="App Store URL" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {app.google_play_url && <a href={app.google_play_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Play Store</a>}
                              {app.app_store_url && <a href={app.app_store_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">App Store</a>}
                              {!app.google_play_url && !app.app_store_url && <span className="text-sm text-muted-foreground">-</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={app.is_active}
                            onCheckedChange={(checked) => toggleAppMutation.mutate({ id: app.id, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {editingAppId === app.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingAppId(null); setEditAppValues({}); }}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={() => updateAppMutation.mutate({ id: app.id, updates: editAppValues })}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingAppId(app.id); setEditAppValues({ name: app.name, logo_url: app.logo_url, creator: app.creator, signup_url: app.signup_url, google_play_url: app.google_play_url, app_store_url: app.app_store_url }); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteAppMutation.mutate(app.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
