import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
        title: t("common.error"),
        description: t("patient.healthAlbum.failedToLoadPhotos"),
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
        title: t("patient.healthAlbum.photoDeleted"),
        description: t("patient.healthAlbum.photoDeletedDescription"),
      });

      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: t("common.error"),
        description: t("patient.healthAlbum.failedToDeletePhoto"),
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
        <h2 className="text-xl font-semibold mb-2">{t("patient.healthAlbum.notAvailable")}</h2>
        <p className="text-muted-foreground">
          {t("patient.healthAlbum.notAvailableDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("patient.healthAlbum.title")}</h1>
          <p className="text-muted-foreground text-[12px] mt-1">
            {t("patient.healthAlbum.subtitle")}
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
            <p className="text-xs text-muted-foreground">{t("patient.healthAlbum.totalPhotos")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.gym}</p>
            <p className="text-xs text-muted-foreground">{t("patient.healthAlbum.gymSessions")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.healthy_meal}</p>
            <p className="text-xs text-muted-foreground">{t("patient.healthAlbum.healthyMeals")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.medication}</p>
            <p className="text-xs text-muted-foreground">{t("patient.healthAlbum.medications")}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.lollipops}</p>
            <p className="text-xs text-muted-foreground">{t("patient.healthAlbum.lollipopsEarned")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t("patient.healthAlbum.photoGallery")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-primary">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">{t("common.all")}</TabsTrigger>
              <TabsTrigger value="gym" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                <Dumbbell className="h-4 w-4" /> {t("patient.healthAlbum.gym")}
              </TabsTrigger>
              <TabsTrigger value="healthy_meal" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                <Utensils className="h-4 w-4" /> {t("patient.healthAlbum.meals")}
              </TabsTrigger>
              <TabsTrigger value="medication" className="gap-1 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                <Pill className="h-4 w-4" /> {t("patient.healthAlbum.medication")}
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
                  <h3 className="font-medium text-foreground mb-1">{t("patient.healthAlbum.noPhotosYet")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("patient.healthAlbum.startCapturingHabits")}
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
                                  <AlertDialogTitle>{t("patient.healthAlbum.deletePhotoTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("patient.healthAlbum.deletePhotoDescription")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePhoto(photo)}>
                                    {t("common.delete")}
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
          <CardTitle className="text-lg">{t("patient.healthAlbum.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Dumbbell className="h-4 w-4 text-blue-500 mt-0.5" />
              <span><strong>{t("patient.healthAlbum.tipGym")}:</strong> {t("patient.healthAlbum.tipGymDescription")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Utensils className="h-4 w-4 text-green-500 mt-0.5" />
              <span><strong>{t("patient.healthAlbum.tipMeal")}:</strong> {t("patient.healthAlbum.tipMealDescription")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-purple-500 mt-0.5" />
              <span><strong>{t("patient.healthAlbum.tipMedication")}:</strong> {t("patient.healthAlbum.tipMedicationDescription")}</span>
            </li>
            <li className="flex items-start gap-2 text-yellow-600">
              <Award className="h-4 w-4 mt-0.5" />
              <span><strong>{t("patient.healthAlbum.noteTitle")}:</strong> {t("patient.healthAlbum.noteDescription")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
