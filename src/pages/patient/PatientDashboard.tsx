import { Calendar, FileText, Receipt, Clock, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name || 'Patient'}
          </h1>
          <p className="text-muted-foreground">
            Manage your health information and appointments
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Next: Tomorrow at 10:00 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">1 refill needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Last: {format(new Date(), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R 1,250</div>
            <p className="text-xs text-muted-foreground">2 invoices pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              My Calendar
            </CardTitle>
            <CardDescription>View and manage your appointments</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prescriptions
            </CardTitle>
            <CardDescription>View your prescription history</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoices
            </CardTitle>
            <CardDescription>View and pay your invoices</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Connected Doctors */}
      <Card>
        <CardHeader>
          <CardTitle>My Healthcare Providers</CardTitle>
          <CardDescription>Doctors who have access to your health information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Dr. Georgia Adams</p>
                  <p className="text-sm text-muted-foreground">General Practitioner</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Connected since</p>
                <p className="text-sm font-medium">{format(new Date(), "MMM yyyy")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center py-2">
              Want to add another doctor? Go to Settings to invite a new provider.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
