import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Save, Edit3, Sparkles } from "lucide-react";
import type { EmailResponse } from "@shared/schema";

interface ResponseEditorProps {
  response?: EmailResponse;
  onSend: (responseText: string, tone: string) => void;
  onSaveDraft: (responseText: string, tone: string) => void;
  onRegenerate: (tone: string) => void;
  isGenerating?: boolean;
  isSending?: boolean;
}

export function ResponseEditor({ 
  response, 
  onSend, 
  onSaveDraft, 
  onRegenerate,
  isGenerating,
  isSending 
}: ResponseEditorProps) {
  const [responseText, setResponseText] = useState(response?.responseText || "");
  const [tone, setTone] = useState(response?.tone || "professional");
  const [isEditing, setIsEditing] = useState(false);

  const handleSend = () => {
    if (responseText.trim()) {
      onSend(responseText, tone);
    }
  };

  const handleSaveDraft = () => {
    if (responseText.trim()) {
      onSaveDraft(responseText, tone);
    }
  };

  const handleRegenerate = () => {
    onRegenerate(tone);
  };

  return (
    <Card data-testid="response-editor-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-medium">Generated Response</CardTitle>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-[140px] h-9" data-testid="select-tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleRegenerate}
            disabled={isGenerating}
            data-testid="button-regenerate"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {isGenerating ? "Generating..." : "Regenerate"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            value={responseText}
            onChange={(e) => {
              setResponseText(e.target.value);
              setIsEditing(true);
            }}
            placeholder="AI-generated response will appear here..."
            className="min-h-48 text-sm leading-relaxed resize-none"
            data-testid="textarea-response"
          />
          {!response && !responseText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground">
                Select an email to generate a response
              </p>
            </div>
          )}
        </div>

        {responseText && (
          <div className="flex items-center justify-end gap-3">
            <Button 
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSending}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            
            <Button 
              onClick={handleSend}
              disabled={isSending || !responseText.trim()}
              data-testid="button-send"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Now"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
