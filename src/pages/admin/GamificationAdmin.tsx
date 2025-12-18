import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Save, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useGamificationAdmin, GamificationConfig } from "@/hooks/usePatientRewards";

export default function GamificationAdmin() {
  const { configs, loading, updateConfig, createConfig, deleteConfig } = useGamificationAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<GamificationConfig>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    visit_category: "",
    lollipops_awarded: 1,
    description: "",
    is_active: true,
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
    if (!newConfig.visit_category) return;
    
    await createConfig(newConfig as any);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gamification Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Configure lollipop rewards for different visit types
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Reward Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Reward Category</DialogTitle>
              <DialogDescription>
                Create a new visit type that awards lollipops to patients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Visit Category Name</Label>
                <Input
                  placeholder="e.g., Dental Checkup"
                  value={newConfig.visit_category}
                  onChange={(e) => setNewConfig({ ...newConfig, visit_category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lollipops Awarded</Label>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {configs.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Lollipops/Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-600">
              {Math.max(...configs.map(c => c.lollipops_awarded), 0)} 🍭
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Reward Categories
          </CardTitle>
          <CardDescription>
            Configure how many lollipops patients earn for each type of visit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visit Category</TableHead>
                <TableHead>Lollipops</TableHead>
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
                      <span className="inline-flex items-center gap-1 text-pink-600 font-semibold">
                        {config.lollipops_awarded} 🍭
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
    </div>
  );
}
