import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorInvoices from "@/pages/doctor/Invoices";
import Documents from "@/pages/Documents";
import CalendarView from "@/pages/CalendarView";
import TodoList from "@/pages/TodoList";

export default function Admin() {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold text-foreground">Admin</h1>
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="calendar"
            className="tab-brand text-xs whitespace-nowrap px-3 py-1.5"
          >
            Calendar
          </TabsTrigger>
          <TabsTrigger
            value="todo"
            className="tab-brand text-xs whitespace-nowrap px-3 py-1.5"
          >
            To-Do
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="tab-brand text-xs whitespace-nowrap px-3 py-1.5"
          >
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="tab-brand text-xs whitespace-nowrap px-3 py-1.5"
          >
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <div className="admin-tab-scope">
            <CalendarView />
          </div>
        </TabsContent>

        <TabsContent value="todo" className="mt-4">
          <div className="admin-tab-scope">
            <TodoList />
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <div className="admin-tab-scope">
            <DoctorInvoices hideHeader />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="admin-tab-scope">
            <Documents hideHeader />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
