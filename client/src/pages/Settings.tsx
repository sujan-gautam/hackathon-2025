import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/email/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { UserSettings } from "@/schema/emailSchema";

const INTENT_OPTIONS = [
  { value: "meeting_request", label: "Meeting Requests" },
  { value: "question", label: "Questions" },
  { value: "follow_up", label: "Follow-ups" },
  { value: "assignment", label: "Assignments" },
  { value: "billing", label: "Billing Inquiries" },
];

export default function Settings() {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!settings?.id) throw new Error("Settings not loaded");
      
      // Only send updatable fields
      const payload = {
        defaultTone: updates.defaultTone,
        autoSendEnabled: updates.autoSendEnabled,
        autoSendIntents: updates.autoSendIntents,
        pollingEnabled: updates.pollingEnabled,
        pollingInterval: updates.pollingInterval,
      };
      
      return apiRequest(`/api/settings/${settings.id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Only send the editable fields - use nullish coalescing to preserve empty arrays
    const autoSendEnabled = localSettings.autoSendEnabled ?? settings?.autoSendEnabled ?? false;
    const updates = {
      defaultTone: localSettings.defaultTone ?? settings?.defaultTone ?? "professional",
      autoSendEnabled,
      // Clear intents if auto-send is disabled
      autoSendIntents: autoSendEnabled 
        ? (localSettings.autoSendIntents ?? settings?.autoSendIntents ?? [])
        : [],
      pollingEnabled: localSettings.pollingEnabled ?? settings?.pollingEnabled ?? false,
      pollingInterval: localSettings.pollingInterval ?? settings?.pollingInterval ?? 5,
    };
    updateMutation.mutate(updates);
  };

  const toggleIntent = (intent: string) => {
    const currentIntents = localSettings.autoSendIntents || [];
    const newIntents = currentIntents.includes(intent)
      ? currentIntents.filter(i => i !== intent)
      : [...currentIntents, intent];
    setLocalSettings({ ...localSettings, autoSendIntents: newIntents });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your email automation preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Generation</CardTitle>
          <CardDescription>
            Customize how AI generates email responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="default-tone">Default Response Tone</Label>
              <p className="text-sm text-muted-foreground">
                The tone used for AI-generated responses
              </p>
            </div>
            <Select
              value={localSettings.defaultTone || "professional"}
              onValueChange={(value) => setLocalSettings({ ...localSettings, defaultTone: value })}
            >
              <SelectTrigger className="w-40" data-testid="select-default-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Send Automation</CardTitle>
          <CardDescription>
            Automatically send responses for specific email types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-send">Enable Auto-Send</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send AI responses without manual review
              </p>
            </div>
            <Switch
              id="auto-send"
              checked={localSettings.autoSendEnabled || false}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, autoSendEnabled: checked })
              }
              data-testid="switch-auto-send"
            />
          </div>

          {localSettings.autoSendEnabled && (
            <div className="space-y-3">
              <Label>Auto-send for these intents:</Label>
              <div className="space-y-2">
                {INTENT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Switch
                      checked={(localSettings.autoSendIntents || []).includes(option.value)}
                      onCheckedChange={() => toggleIntent(option.value)}
                      data-testid={`switch-intent-${option.value}`}
                    />
                    <Label className="font-normal">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Polling</CardTitle>
          <CardDescription>
            Automatically check for new emails in the background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="polling">Enable Automatic Polling</Label>
              <p className="text-sm text-muted-foreground">
                Periodically fetch new emails from Gmail
              </p>
            </div>
            <Switch
              id="polling"
              checked={localSettings.pollingEnabled || false}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, pollingEnabled: checked })
              }
              data-testid="switch-polling"
            />
          </div>

          {localSettings.pollingEnabled && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="polling-interval">Polling Interval</Label>
                <p className="text-sm text-muted-foreground">
                  How often to check for new emails (minutes)
                </p>
              </div>
              <Select
                value={String(localSettings.pollingInterval || 5)}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, pollingInterval: Number(value) })
                }
              >
                <SelectTrigger className="w-32" data-testid="select-polling-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
