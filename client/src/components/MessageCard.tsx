import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Mail, MailOpen } from "lucide-react";

interface MessageCardProps {
  id: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  relatedTask?: string;
  onMarkRead?: () => void;
}

export default function MessageCard({
  id,
  message,
  timestamp,
  isRead,
  relatedTask,
  onMarkRead,
}: MessageCardProps) {
  const handleClick = () => {
    if (!isRead && onMarkRead) {
      onMarkRead();
      console.log(`Message ${id} marked as read`);
    }
  };

  return (
    <Card
      className={`cursor-pointer hover-elevate ${!isRead ? "border-primary" : ""}`}
      onClick={handleClick}
      data-testid={`card-message-${id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isRead ? "bg-muted" : "bg-primary/10"}`}>
            {isRead ? (
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Mail className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm ${!isRead ? "font-semibold" : ""}`}>{message}</p>
              {!isRead && (
                <Badge variant="secondary" className="shrink-0">New</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span>{format(timestamp, "MMM dd, yyyy h:mm a")}</span>
              {relatedTask && (
                <>
                  <span>•</span>
                  <span>Related to: {relatedTask}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
