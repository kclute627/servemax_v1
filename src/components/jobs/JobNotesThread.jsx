import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { FirebaseFunctions } from '@/firebase/functions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Send,
  Loader2,
  MessageSquare,
  User,
  Building2,
  Briefcase,
  Mail,
  MailCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * JobNotesThread - Hub-and-spoke messaging for jobs
 *
 * @param {Object} props
 * @param {string} props.jobId - The job ID
 * @param {Object} props.job - The job object (for context)
 * @param {string} props.userType - 'company' | 'client' | 'server'
 * @param {string} props.currentUserId - Current user's ID
 * @param {string} props.companyId - Current user's company ID
 * @param {boolean} props.hasClient - Whether job has a client contact
 * @param {boolean} props.hasServer - Whether job has been shared to a server
 * @param {boolean} props.readOnly - Disable composing (for view-only access)
 */
export default function JobNotesThread({
  jobId,
  job,
  userType = 'company',
  currentUserId,
  companyId,
  hasClient = false,
  hasServer = false,
  readOnly = false,
}) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('client'); // Default to client for company users
  const [sendEmail, setSendEmail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef(null);

  // Subscribe to notes in real-time
  useEffect(() => {
    if (!jobId) return;

    const notesQuery = query(
      collection(db, `jobs/${jobId}/notes`),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamp to Date
          created_at: doc.data().created_at?.toDate?.() || new Date(),
        }));

        // Filter notes based on user type and visibility
        const filteredNotes = notesData.filter((note) => {
          if (userType === 'company') {
            // Company can see all notes
            return true;
          } else if (userType === 'client') {
            // Client can see notes visible to client or their own notes
            return (
              note.visibility === 'client' ||
              note.visibility === 'both' ||
              note.author_id === currentUserId
            );
          } else if (userType === 'server') {
            // Server can see notes visible to server or their own notes
            return (
              note.visibility === 'server' ||
              note.visibility === 'both' ||
              note.author_id === currentUserId
            );
          }
          return false;
        });

        setNotes(filteredNotes);
        setIsLoading(false);

        // Scroll to bottom when new notes arrive
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      },
      (err) => {
        console.error('Error loading notes:', err);
        setError('Failed to load messages');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, userType, currentUserId]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      // For client/server, always send as 'internal' (to company)
      const noteVisibility = userType === 'company' ? visibility : 'internal';

      await FirebaseFunctions.createJobNote(
        jobId,
        content.trim(),
        noteVisibility,
        userType === 'company' ? sendEmail : false // Only company can send emails
      );

      setContent('');
      setSendEmail(false);
    } catch (err) {
      console.error('Error sending note:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getVisibilityLabel = (vis) => {
    switch (vis) {
      case 'client':
        return 'To Client';
      case 'server':
        return 'To Server';
      case 'both':
        return 'To Both';
      case 'internal':
        return 'Reply';
      default:
        return vis;
    }
  };

  const getVisibilityBadgeStyle = (vis) => {
    switch (vis) {
      case 'client':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'server':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'both':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'internal':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAuthorIcon = (authorType) => {
    switch (authorType) {
      case 'company':
        return <Building2 className="w-4 h-4" />;
      case 'client':
        return <Briefcase className="w-4 h-4" />;
      case 'server':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getAuthorBgColor = (authorType) => {
    switch (authorType) {
      case 'company':
        return 'bg-blue-100 text-blue-700';
      case 'client':
        return 'bg-amber-100 text-amber-700';
      case 'server':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Determine available visibility options based on what the job has
  const getVisibilityOptions = () => {
    const options = [];
    if (hasClient) options.push({ value: 'client', label: 'Client Only' });
    if (hasServer) options.push({ value: 'server', label: 'Server Only' });
    if (hasClient && hasServer) options.push({ value: 'both', label: 'Both' });
    return options;
  };

  const visibilityOptions = getVisibilityOptions();

  // Set default visibility based on available options
  useEffect(() => {
    if (userType === 'company' && visibilityOptions.length > 0 && !visibilityOptions.find(o => o.value === visibility)) {
      setVisibility(visibilityOptions[0].value);
    }
  }, [visibilityOptions, userType, visibility]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with collapse toggle */}
      <div
        className="flex items-center justify-between cursor-pointer pb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Messages {notes.length > 0 && `(${notes.length})`}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <>
          {/* Notes List */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 max-h-[300px] min-h-[100px] py-2"
          >
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  {userType === 'company'
                    ? 'Send a message to the client or server'
                    : 'Send a message to the company'}
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`flex gap-3 ${
                    note.author_id === currentUserId ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Author Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAuthorBgColor(
                      note.author_type
                    )}`}
                  >
                    {getAuthorIcon(note.author_type)}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`flex-1 max-w-[85%] ${
                      note.author_id === currentUserId ? 'items-end' : ''
                    }`}
                  >
                    {/* Header: Author name, visibility badge, time */}
                    <div
                      className={`flex items-center gap-2 mb-1 flex-wrap ${
                        note.author_id === currentUserId ? 'justify-end' : ''
                      }`}
                    >
                      <span className="text-xs font-medium text-gray-700">
                        {note.author_name}
                      </span>
                      {userType === 'company' && note.visibility !== 'internal' && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getVisibilityBadgeStyle(
                            note.visibility
                          )}`}
                        >
                          {getVisibilityLabel(note.visibility)}
                        </Badge>
                      )}
                      {note.email_sent && (
                        <MailCheck className="w-3 h-3 text-green-500" title="Email sent" />
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(note.created_at, { addSuffix: true })}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        note.author_id === currentUserId
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{note.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          {!readOnly && (
            <div className="border-t pt-3 mt-2">
              {error && (
                <p className="text-xs text-red-500 mb-2">{error}</p>
              )}

              {/* Visibility selector and email checkbox - only for company */}
              {userType === 'company' && visibilityOptions.length > 0 && (
                <div className="flex items-center gap-3 mb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        {getVisibilityLabel(visibility)}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuRadioGroup value={visibility} onValueChange={setVisibility}>
                        {visibilityOptions.map((option) => (
                          <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="send-email"
                      checked={sendEmail}
                      onCheckedChange={setSendEmail}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="send-email" className="text-xs text-gray-600 cursor-pointer">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Send email
                    </Label>
                  </div>
                </div>
              )}

              {/* No recipients message */}
              {userType === 'company' && visibilityOptions.length === 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  No client or server to message. Add a contact email or share this job first.
                </p>
              )}

              {/* Message input and send button */}
              <div className="flex gap-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    userType === 'company'
                      ? 'Type a message...'
                      : 'Type a reply to the company...'
                  }
                  className="min-h-[60px] max-h-[120px] resize-none text-sm"
                  disabled={isSending || (userType === 'company' && visibilityOptions.length === 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={
                    !content.trim() ||
                    isSending ||
                    (userType === 'company' && visibilityOptions.length === 0)
                  }
                  size="sm"
                  className="h-auto"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Press Cmd+Enter to send
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
