import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getGmailEmails, GmailMessage } from '@/services/gmailService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, User } from 'lucide-react';

const GmailInbox: React.FC = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGmail, setHasGmail] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchEmails = async () => {
      try {
        setLoading(true);
        const response = await getGmailEmails({ limit: 10 });
        setEmails(response.messages);
        setHasGmail(response.total > 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load emails');
        if (err.message.includes('Gmail not connected')) {
          setHasGmail(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading your emails...</span>
      </div>
    );
  }

  if (error && !hasGmail) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Gmail</h3>
          <p className="text-sm text-gray-600 mb-4">
            Sign in with Google to access your emails and set up automation.
          </p>
          <button
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Connect Gmail
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Inbox ({emails.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No emails found</p>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-l-4 border-blue-500"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate text-sm">{email.subject || 'No Subject'}</h4>
                      <Badge variant="outline" className="text-xs">
                        {email.labels?.includes('INBOX') ? 'Inbox' : 'Other'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{email.from}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(email.date).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 italic max-w-xs line-clamp-2">
                    {email.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailInbox;