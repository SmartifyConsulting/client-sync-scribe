import { useState, useEffect } from "react";
import { Camera, Dumbbell, Utensils, Pill, Trash2, Calendar, Award, Loader2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HealthPhotoCapture } from "@/components/health/HealthPhotoCapture";
import { extractStoragePath, getSignedUrl } from "@/utils/storageUrls";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HealthPhoto {
  id: string;
  photo_url: string;
  category: string;
  lollipops_awarded: number;
  captured_at: string;
  photo_date: string;
  ai_validation_result: any;
}

const CATEGORY_CONFIG = {
  gym: { label: 'Gym / Exercise', icon: Dumbbell, color: 'bg-blue-500', textColor: 'text-blue-600' },
  healthy_meal: { label: 'Healthy Meal', icon: Utensils, color: 'bg-green-500', textColor: 'text-green-600' },
  medication: { label: 'Medication', icon: Pill, color: 'bg-purple-500', textColor: 'text-purple-600' },
};

export default function HealthAlbum() {
  const [photos, setPhotos] = useState<HealthPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [stats, setStats] = useState({ total: 0, gym: 0, healthy_meal: 0, medication: 0, lollipops: 0 });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPatientId();
    }
  }, [user]);

  useEffect(() => {
    if (patientId) {
      fetchPhotos();
    }
  }, [patientId]);

  const fetchPatientId = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_user_id', user.id)
      .single();

    if (!error && data) {
      setPatientId(data.id);
    } else {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!patientId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('health_photos')
      .select('*')
      .eq('patient_id', patientId)
      .order('captured_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Error",
        description: "Failed to load photos",
        variant: "destructive",
      });
    } else {
      // Bucket is private — sign each photo URL for display.
      const signed = await Promise.all(
        (data || []).map(async (p: any) => {
          const signedUrl = await getSignedUrl('health-photos', p.photo_url);
          return { ...p, photo_url: signedUrl || p.photo_url };
        })
      );
      setPhotos(signed);

      // Calculate stats
      const newStats = {
        total: data?.length || 0,
        gym: data?.filter(p => p.category === 'gym').length || 0,
        healthy_meal: data?.filter(p => p.category === 'healthy_meal').length || 0,
        medication: data?.filter(p => p.category === 'medication').length || 0,
        lollipops: data?.reduce((sum, p) => sum + (p.lollipops_awarded || 0), 0) || 0,
      };
      setStats(newStats);
    }
    setLoading(false);
  };

  const deletePhoto = async (photo: HealthPhoto) => {
    try {
      // photo.photo_url has been signed for display — derive the underlying
      // storage path from the signed URL, falling back to the value itself.
      const path = extractStoragePath('health-photos', photo.photo_url);

      // Delete from storage (best effort)
      if (path) {
        await supabase.storage.from('health-photos').remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('health_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      toast({
        title: "Photo Deleted",
        description: "The photo has been removed from your album",
      });

      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    }
  };

  const filteredPhotos = activeTab === 'all' 
    ? photos 
    : photos.filter(p => p.category === activeTab);

  if (!patientId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Image className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Health Album Not Available</h2>
        <p className="text-muted-foreground">
          You need to be linked as a patient to use the Health Album feature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Health Album</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Capture your healthy habits and earn rewards
          </p>
        </div>
        {patientId && (
          <HealthPhotoCapture patientId={patientId} onPhotoSaved={fetchPhotos} />
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Photos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.gym}</p>
            <p className="text-xs text-muted-foreground">Gym Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.healthy_meal}</p>
            <p className="text-xs text-muted-foreground">Healthy Meals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.medication}</p>
            <p className="text-xs text-muted-foreground">Medications</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.lollipops}</p>
            <p className="text-xs text-muted-foreground">Lollipops Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-primary">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5">All</TabsTrigger>
              <TabsTrigger value="gym" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5">
                <Dumbbell className="h-4 w-4" /> Gym
              </TabsTrigger>
              <TabsTrigger value="healthy_meal" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5">
                <Utensils className="h-4 w-4" /> Meals
              </TabsTrigger>
              <TabsTrigger value="medication" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5">
                <Pill className="h-4 w-4" /> Medication
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No photos yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start capturing your healthy habits to earn lollipops!
                  </p>
                  {patientId && (
                    <HealthPhotoCapture patientId={patientId} onPhotoSaved={fetchPhotos} />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPhotos.map((photo) => {
                    const config = CATEGORY_CONFIG[photo.category as keyof typeof CATEGORY_CONFIG];
                    const Icon = config?.icon || Camera;

                    return (
                      <div
                        key={photo.id}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
                      >
                        <img
                          src={photo.photo_url}
                          alt={config?.label || photo.category}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Category Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge className={cn("gap-1", config?.color)}>
                            <Icon className="h-4 w-4" />
                            {config?.label}
                          </Badge>
                        </div>

                        {/* Lollipops Badge */}
                        {photo.lollipops_awarded > 0 && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
                              <Award className="h-4 w-4" />
                              +{photo.lollipops_awarded}
                            </Badge>
                          </div>
                        )}

                        {/* Bottom Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-between text-white text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(photo.captured_at), 'MMM d, yyyy')}
                            </span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-white hover:bg-white/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this photo from your album. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePhoto(photo)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Earning Lollipops</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Dumbbell className="h-4 w-4 text-blue-500 mt-0.5" />
              <span><strong>Gym (2 lollipops):</strong> Capture yourself at the gym, exercising, or doing any physical activity</span>
            </li>
            <li className="flex items-start gap-2">
              <Utensils className="h-4 w-4 text-green-500 mt-0.5" />
              <span><strong>Healthy Meals (1 lollipop):</strong> Take a photo of nutritious meals with vegetables, fruits, or balanced foods</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-purple-500 mt-0.5" />
              <span><strong>Medication (3 lollipops):</strong> Capture yourself taking medication or your medication supplies (important for diabetes management!)</span>
            </li>
            <li className="flex items-start gap-2 text-yellow-600">
              <Award className="h-4 w-4 mt-0.5" />
              <span><strong>Note:</strong> You can only earn rewards once per category per day. Photos are validated by AI to ensure authenticity.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
