import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/hooks/useSessions";

interface SessionHistoryTableProps {
  sessions: Session[];
  clientId: string;
  clientName: string;
  allergies?: string | null;
}

export function SessionHistoryTable({ sessions, clientId, clientName, allergies }: SessionHistoryTableProps) {
  const navigate = useNavigate();
  const handleGenerateDocument = (session: Session, templateType: string) => {
    navigate(`/documents?template=${templateType}&client=${clientId}&session=${session.id}`);
  };

  return (
    <>
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead className="w-[100px]">Duration</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow 
                key={session.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {format(new Date(session.started_at), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.started_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-foreground">
                  {session.duration_minutes ? `${session.duration_minutes} min` : "—"}
                </TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {session.summary || "No summary available"}
                  </p>
                </TableCell>

                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleGenerateDocument(session, "medical-certificate")}>
                          <FileText className="mr-2 h-4 w-4" />
                          Medical Certificate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateDocument(session, "referral")}>
                          <FileText className="mr-2 h-4 w-4" />
                          Referral Letter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </>
  );
}