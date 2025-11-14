import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IntentBadge, type IntentType } from "./intent-badge";
import { formatDistanceToNow } from "date-fns";
import type { EmailWithDetails } from "../../schema/emailSchema";

interface EmailListProps {
  emails: EmailWithDetails[];
  selectedEmailId?: string;
  onSelectEmail: (emailId: string) => void;
  isLoading?: boolean;
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, isLoading }: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredEmails = emails.filter((email) => {
    const matchesSearch = 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.snippet?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "unread" ? !email.isRead :
      activeTab === "pending" ? email.response?.status === "draft" :
      activeTab === "sent" ? email.response?.status === "sent" : true;

    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="w-full md:w-[400px] border-r border-border flex flex-col h-screen bg-background">
        <div className="p-4 border-b border-border space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-[400px] border-r border-border flex flex-col h-screen bg-background" data-testid="email-list-panel">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
            data-testid="input-search-emails"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-10">
            <TabsTrigger value="all" className="text-xs" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs" data-testid="tab-unread">Unread</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="sent" className="text-xs" data-testid="tab-sent">Sent</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <p className="text-sm text-muted-foreground">No emails found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different search query" : "Your emails will appear here"}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => (
            <Card
              key={email.id}
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                selectedEmailId === email.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectEmail(email.id)}
              data-testid={`email-card-${email.id}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`email-from-${email.id}`}>
                      {email.from}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                    </p>
                  </div>
                  {email.intent && (
                    <IntentBadge 
                      intent={email.intent.intent as IntentType} 
                      confidence={email.intent.confidence}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-base font-medium truncate" data-testid={`email-subject-${email.id}`}>
                    {email.subject}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {email.snippet || email.body.substring(0, 100) + "..."}
                  </p>
                </div>

                {!email.isRead && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-xs font-medium text-primary">Unread</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
