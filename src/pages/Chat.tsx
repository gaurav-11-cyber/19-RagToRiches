import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ChatInput from '@/components/chat/ChatInput';
import ChatBubble from '@/components/chat/ChatBubble';
import FileUploadDialog from '@/components/chat/FileUploadDialog';
import { useToast } from '@/hooks/use-toast';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  evidence?: Array<{ document?: string; page?: string; text?: string }>;
  confidence?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-chat`;

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChat = async () => {
      if (!chatId || !user) return;

      // Fetch chat details
      const { data: chat } = await supabase
        .from('chats')
        .select('title')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();

      if (chat) {
        setChatTitle(chat.title);
      }

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages(messagesData.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          evidence: m.evidence as Array<{ document?: string; page?: string; text?: string }> | undefined,
          confidence: m.confidence || undefined,
        })));
      }
    };

    fetchChat();
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!user || !chatId) return;

    // Add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message to DB
      const { data: savedUserMsg } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: 'user',
          content,
        })
        .select()
        .single();

      // Update chat title if it's still "New Chat"
      if (chatTitle === 'New Chat' && messages.length === 0) {
        const newTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        await supabase
          .from('chats')
          .update({ title: newTitle })
          .eq('id', chatId);
        setChatTitle(newTitle);
      }

      // Fetch user's documents for context
      const { data: documents } = await supabase
        .from('documents')
        .select('name, content')
        .eq('user_id', user.id);

      // Call RAG edge function
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          documents: documents || [],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Rate limit exceeded',
            description: 'Please try again later.',
            variant: 'destructive',
          });
        } else if (response.status === 402) {
          toast({
            title: 'Payment required',
            description: 'Please add funds to continue.',
            variant: 'destructive',
          });
        } else {
          throw new Error('Failed to get response');
        }
        setIsLoading(false);
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantEvidence: Array<{ document?: string; page?: string; text?: string }> = [];
      let assistantConfidence = '';

      // Add placeholder assistant message
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
      }]);

      if (reader) {
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg.role === 'assistant') {
                    lastMsg.content = assistantContent;
                  }
                  return newMessages;
                });
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }

      // Parse evidence from response
      const evidenceMatch = assistantContent.match(/Evidence:\n([\s\S]*?)(?=\n\nConfidence:|$)/);
      const confidenceMatch = assistantContent.match(/Confidence:\s*(High|Medium|Low)/i);
      
      if (evidenceMatch) {
        const evidenceLines = evidenceMatch[1].split('\n').filter(l => l.trim());
        evidenceLines.forEach(line => {
          const docMatch = line.match(/Document:\s*(.+)/);
          const pageMatch = line.match(/Page\/Section:\s*(.+)/);
          const textMatch = line.match(/Source text:\s*"(.+)"/);
          if (docMatch || pageMatch || textMatch) {
            assistantEvidence.push({
              document: docMatch?.[1],
              page: pageMatch?.[1],
              text: textMatch?.[1],
            });
          }
        });
      }
      
      if (confidenceMatch) {
        assistantConfidence = confidenceMatch[1];
      }

      // Save assistant message to DB
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: 'assistant',
          content: assistantContent,
          evidence: assistantEvidence.length > 0 ? assistantEvidence : null,
          confidence: assistantConfidence || null,
        });

      // Update final message with evidence
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.evidence = assistantEvidence.length > 0 ? assistantEvidence : undefined;
          lastMsg.confidence = assistantConfidence || undefined;
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-border/20">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-medium text-foreground truncate max-w-[200px]">
          {chatTitle}
        </h1>
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <MoreVertical className="w-6 h-6 text-foreground" />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">FS</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Start a conversation</h2>
              <p className="text-muted-foreground text-sm">
                Ask anything about your uploaded documents.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                evidence={message.evidence}
                confidence={message.confidence}
                isLoading={isLoading && index === messages.length - 1 && message.role === 'assistant' && !message.content}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <ChatBubble
                role="assistant"
                content=""
                isLoading={true}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="p-4 pb-8">
        <ChatInput 
          onSend={handleSend} 
          onFileUpload={() => setShowUploadDialog(true)}
          disabled={isLoading}
          placeholder="Ask anything...."
        />
      </footer>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
      />
    </div>
  );
};

export default Chat;
