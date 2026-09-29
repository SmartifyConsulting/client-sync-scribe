import { useState, useEffect } from "react";
import { Camera, Dumbbell, Utensils, Wallet as Pill, Calendar, Award, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface PatientHealthPhotoStatsProps {
  patientId: string;
}

interface PhotoStat {
  month: Date;
  gym: number;
  healthy_meal: number;
  medication: number;
  total: number;
  lollipops: number;
}

const CATEGORY_CONFIG = {
  gym: { label: 'Gym', icon: Dumbbell, color: 'bg-blue-500', textColor: 'text-blue-600' },
  healthy_meal: { label: 'Meals', icon: Utensils, color: 'bg-sky-500', textColor: 'text-primary' },
  medication: { label: 'Medication', icon: Pill, color: 'bg-purple-500', textColor: 'text-purple-600' },
};

export function PatientHealthPhotoStats({ patientId }: PatientHealthPhotoStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PhotoStat[]>([]);
  const [totals, setTotals] = useState({ gym: 0, healthy_meal: 0, medication: 0, total: 0, lollipops: 0 });

  useEffect(() => {
    fetchPhotoStats();
  }, [patientId]);

  const fetchPhotoStats = async () => {
    setLoading(true);
    
    // Fetch rewards that are from health photos (visit_category starts with 'health_photo_')
    const { data: rewards, error } = await supabase
      .from('patient_rewards')
      .select('visit_category, lollipops_count, awarded_at')
      .eq('patient_id', patientId)
      .like('visit_category', 'health_photo_%')
      .order('awarded_at', { ascending: false });

    if (error) {
      console.error('Error fetching photo stats:', error);
      setLoading(false);
      return;
    }

    // Group by month
    const monthlyStats = new Map<string, PhotoStat>();
    let gymTotal = 0, mealTotal = 0, medTotal = 0, lollipopTotal = 0;

    (rewards || []).forEach(reward => {
      const date = parseISO(reward.awarded_at);
      const monthKey = format(startOfMonth(date), 'yyyy-MM');
      const category = reward.visit_category.replace('health_photo_', '');
      
      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, {
          month: startOfMonth(date),
          gym: 0,
          healthy_meal: 0,
          medication: 0,
          total: 0,
          lollipops: 0,
        });
      }

      const stat = monthlyStats.get(monthKey)!;
      if (category === 'gym') {
        stat.gym++;
        gymTotal++;
      } else if (category === 'healthy_meal') {
        stat.healthy_meal++;
        mealTotal++;
      } else if (category === 'medication') {
        stat.medication++;
        medTotal++;
      }
      stat.total++;
      stat.lollipops += reward.lollipops_count;
      lollipopTotal += reward.lollipops_count;
    });

    // Convert to sorted array
    const sortedStats = Array.from(monthlyStats.values()).sort(
      (a, b) => b.month.getTime() - a.month.getTime()
    );

    setStats(sortedStats);
    setTotals({
      gym: gymTotal,
      healthy_meal: mealTotal,
      medication: medTotal,
      total: gymTotal + mealTotal + medTotal,
      lollipops: lollipopTotal,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          Health photos are private to the patient. Only activity statistics and lollipop rewards are visible here.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Camera className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{totals.total}</p>
            <p className="text-xs text-muted-foreground">Total Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Dumbbell className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{totals.gym}</p>
            <p className="text-xs text-muted-foreground">Gym Consultations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Utensils className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{totals.healthy_meal}</p>
            <p className="text-xs text-muted-foreground">Healthy Meals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Pill className="h-5 w-5 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{totals.medication}</p>
            <p className="text-xs text-muted-foreground">Medications</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 text-center">
            <span className="text-xl mb-2 block">🍭</span>
            <p className="text-2xl font-bold text-yellow-600">{totals.lollipops}</p>
            <p className="text-xs text-muted-foreground">Lollipops Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Monthly Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No health photo activities recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Activities will appear here when the patient captures health photos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div
                  key={format(stat.month, 'yyyy-MM')}
                  className={cn(
                    "p-4 rounded-lg border border-border",
                    index === 0 && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">
                      {format(stat.month, 'MMMM yyyy')}
                    </h4>
                    <Badge variant="secondary" className="gap-1">
                      <Award className="h-4 w-4" />
                      {stat.lollipops} lollipops
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                      <Dumbbell className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        {stat.gym} gym
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-sky-50 dark:bg-primary/15">
                      <Utensils className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary dark:text-primary">
                        {stat.healthy_meal} meals
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                      <Pill className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                        {stat.medication} meds
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
