import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { IntentBadge, type IntentType } from "./intent-badge";
import { ResponseEditor } from "./response-editor";
import { WorkflowActionCard } from "./workflow-action-card";
import { format } from "date-fns";
import type { EmailWithDetails } from "../../schema/emailSchema";

interface EmailDetailProps {
  email?: EmailWithDetails;
  isLoading?: boolean;
  onSendResponse: (responseText: string, tone: string) => void;
  onSaveDraft: (responseText: string, tone: string) => void;
  onRegenerateResponse: (tone: string) => void;
  onCompleteAction: (actionId: string) => void;
  onDismissAction: (actionId: string) => void;
  isGeneratingResponse?: boolean;
  isSendingResponse?: boolean;
}

export function EmailDetail({
  email,
  isLoading,
  onSendResponse,
  onSaveDraft,
  onRegenerateResponse,
  onCompleteAction,
  onDismissAction,
  isGeneratingResponse,
  isSendingResponse,
}: EmailDetailProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No email selected</p>
          <p className="text-xs text-muted-foreground">
            Select an email from the list to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="email-detail-panel">
      {/* Email Header */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-semibold" data-testid="email-detail-subject">
                {email.subject}
              </h2>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">From:</span>
                  <span className="text-muted-foreground font-mono" data-testid="email-detail-from">
                    {email.from}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">To:</span>
                  <span className="text-muted-foreground font-mono" data-testid="email-detail-to">
                    {email.to}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Date:</span>
                  <span className="text-muted-foreground">
                    {format(new Date(email.date), "PPP 'at' p")}
                  </span>
                </div>
              </div>
            </div>
            
            {email.intent && (
              <div data-testid="email-detail-intent">
                <IntentBadge 
                  intent={email.intent.intent as IntentType}
                  confidence={email.intent.confidence}
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="prose prose-sm max-w-none">
            <div 
              className="text-sm leading-relaxed whitespace-pre-wrap" 
              data-testid="email-detail-body"
            >
              {email.body}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Response Section */}
      <ResponseEditor
        response={email.response}
        onSend={onSendResponse}
        onSaveDraft={onSaveDraft}
        onRegenerate={onRegenerateResponse}
        isGenerating={isGeneratingResponse}
        isSending={isSendingResponse}
      />

      {/* Workflow Actions */}
      {email.actions && email.actions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Suggested Actions</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {email.actions.map((action) => (
              <WorkflowActionCard
                key={action.id}
                action={action}
                onComplete={onCompleteAction}
                onDismiss={onDismissAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
