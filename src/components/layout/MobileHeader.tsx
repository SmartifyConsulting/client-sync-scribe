import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-lg border-b border-primary/10 md:hidden">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-teal">
          <span className="text-primary-foreground font-bold text-sm">M</span>
        </div>
        <div>
          <span className="font-semibold text-lg text-foreground">mIRI</span>
          <span className="ml-1.5 text-[10px] text-primary font-medium">Medical Intelligence</span>
        </div>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[210px]">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
