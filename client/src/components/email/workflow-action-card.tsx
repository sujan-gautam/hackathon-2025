import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Download, CheckCircle2 } from "lucide-react";
import type { WorkflowAction } from "@shared/schema";

interface WorkflowActionCardProps {
  action: WorkflowAction;
  onComplete: (actionId: string) => void;
  onDismiss: (actionId: string) => void;
}

const actionIcons: Record<string, any> = {
  add_to_calendar: Calendar,
  create_reminder: Clock,
  save_attachments: Download,
  mark_complete: CheckCircle2,
};

export function WorkflowActionCard({ action, onComplete, onDismiss }: WorkflowActionCardProps) {
  const Icon = actionIcons[action.actionType] || CheckCircle2;
  const isCompleted = action.status === "completed";

  return (
    <Card 
      className={`hover-elevate ${isCompleted ? "opacity-60" : ""}`}
      data-testid={`action-card-${action.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md ${isCompleted ? "bg-muted" : "bg-primary/10"}`}>
            <Icon className={`w-4 h-4 ${isCompleted ? "text-muted-foreground" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium" data-testid={`action-title-${action.id}`}>
              {action.title}
            </h4>
            {action.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {action.description}
              </p>
            )}
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => onComplete(action.id)}
              data-testid={`button-complete-${action.id}`}
            >
              Complete
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDismiss(action.id)}
              data-testid={`button-dismiss-${action.id}`}
            >
              Dismiss
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
