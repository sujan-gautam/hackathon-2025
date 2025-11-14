import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailList } from "@/components/email/email-list";
import { EmailDetail } from "@/components/email/email-detail";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "../lib/email/queryClient";
import type { EmailWithDetails } from "../schema/emailSchema";

export default function Dashboard() {
  const [selectedEmailId, setSelectedEmailId] = useState<string>();
  const { toast } = useToast();

  // Fetch all emails with details
  const { data: emails = [], isLoading } = useQuery<EmailWithDetails[]>({
    queryKey: ["/api/emails"],
  });

  // Fetch emails mutation (manual refresh)
  const fetchEmailsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/emails/fetch");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Emails fetched",
        description: "Successfully fetched new emails from Gmail",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.details || error?.response?.data?.error || "Failed to fetch emails. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Process email mutation (generate intent + response)
  const processEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      return await apiRequest("POST", `/api/emails/${emailId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process email. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send response mutation
  const sendResponseMutation = useMutation({
    mutationFn: async ({ emailId, responseText, tone }: { emailId: string; responseText: string; tone: string }) => {
      return await apiRequest("POST", `/api/emails/${emailId}/send`, { responseText, tone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Response sent",
        description: "Your email response has been sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async ({ emailId, responseText, tone }: { emailId: string; responseText: string; tone: string }) => {
      return await apiRequest("POST", `/api/emails/${emailId}/draft`, { responseText, tone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Draft saved",
        description: "Your response has been saved as a draft",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update action mutation
  const updateActionMutation = useMutation({
    mutationFn: async ({ actionId, status }: { actionId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/actions/${actionId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    const email = emails.find((e) => e.id === emailId);
    
    // Auto-process if not already processed
    if (email && !email.isProcessed) {
      processEmailMutation.mutate(emailId);
    }
  };

  const handleSendResponse = (responseText: string, tone: string) => {
    if (selectedEmailId) {
      sendResponseMutation.mutate({ emailId: selectedEmailId, responseText, tone });
    }
  };

  const handleSaveDraft = (responseText: string, tone: string) => {
    if (selectedEmailId) {
      saveDraftMutation.mutate({ emailId: selectedEmailId, responseText, tone });
    }
  };

  const handleRegenerateResponse = (tone: string) => {
    if (selectedEmailId) {
      processEmailMutation.mutate(selectedEmailId);
    }
  };

  const handleCompleteAction = (actionId: string) => {
    updateActionMutation.mutate({ actionId, status: "completed" });
  };

  const handleDismissAction = (actionId: string) => {
    updateActionMutation.mutate({ actionId, status: "dismissed" });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Email List Panel */}
      <EmailList
        emails={emails}
        selectedEmailId={selectedEmailId}
        onSelectEmail={handleSelectEmail}
        isLoading={isLoading}
      />

      {/* Email Detail Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header with Refresh Button */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Email Automation Dashboard</h1>
          <Button
            onClick={() => fetchEmailsMutation.mutate()}
            disabled={fetchEmailsMutation.isPending}
            data-testid="button-fetch-emails"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${fetchEmailsMutation.isPending ? "animate-spin" : ""}`} />
            {fetchEmailsMutation.isPending ? "Fetching..." : "Fetch Emails"}
          </Button>
        </div>

        <EmailDetail
          email={selectedEmail}
          isLoading={isLoading && !!selectedEmailId}
          onSendResponse={handleSendResponse}
          onSaveDraft={handleSaveDraft}
          onRegenerateResponse={handleRegenerateResponse}
          onCompleteAction={handleCompleteAction}
          onDismissAction={handleDismissAction}
          isGeneratingResponse={processEmailMutation.isPending}
          isSendingResponse={sendResponseMutation.isPending}
        />
      </div>
    </div>
  );
}
