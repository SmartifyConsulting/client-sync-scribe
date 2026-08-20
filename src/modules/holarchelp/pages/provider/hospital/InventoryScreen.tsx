import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Package2, ClipboardList, Truck, Wallet } from "lucide-react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { StockDashboard } from "../../../components/StockDashboard";
import { RequisitionPanel } from "../../../components/RequisitionPanel";
import { PurchaseOrderPanel } from "../../../components/PurchaseOrderPanel";
import { BudgetDashboard } from "../../../components/BudgetDashboard";
import { ProcedureKitsPanel } from "../../../components/ProcedureKitsPanel";

const TAB = "gap-1.5 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5";
const VALID_TABS = ["stock", "kits", "requisitions", "purchase-orders", "budget"];

/** Current calendar quarter as 'YYYY-Qn', e.g. '2026-Q3'. */
function currentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

/** Inventory & Finance — stock levels, requisitions, purchase orders and budget in one place. */
export default function InventoryScreen() {
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "stock";
  const { providerId } = useProviderAccess();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Inventory & Finance</h1>
        <p className="text-muted-foreground text-xs">Stock levels, requisitions, purchase orders and budget tracking</p>
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger value="stock" className={TAB}><Package className="h-3.5 w-3.5" /> Stock</TabsTrigger>
          <TabsTrigger value="kits" className={TAB}><Package2 className="h-3.5 w-3.5" /> Kits</TabsTrigger>
          <TabsTrigger value="requisitions" className={TAB}><ClipboardList className="h-3.5 w-3.5" /> Requisitions</TabsTrigger>
          <TabsTrigger value="purchase-orders" className={TAB}><Truck className="h-3.5 w-3.5" /> Purchase Orders</TabsTrigger>
          <TabsTrigger value="budget" className={TAB}><Wallet className="h-3.5 w-3.5" /> Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <StockDashboard hospitalId={providerId} />
        </TabsContent>
        <TabsContent value="kits" className="mt-4">
          <ProcedureKitsPanel hospitalId={providerId} />
        </TabsContent>
        <TabsContent value="requisitions" className="mt-4">
          <RequisitionPanel hospitalId={providerId} canApprove />
        </TabsContent>
        <TabsContent value="purchase-orders" className="mt-4">
          <PurchaseOrderPanel hospitalId={providerId} />
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          <BudgetDashboard hospitalId={providerId} budgetPeriod={currentQuarter()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
