import { useState } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSend, onFileUpload, disabled = false, placeholder = "Ask anything...." }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-input rounded-full px-4 py-3 flex items-center gap-3">
      {onFileUpload && (
        <button 
          onClick={onFileUpload}
          className="p-2 rounded-full hover:bg-gray-200/50 transition-colors"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
      )}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-500"
      />
      <div className="flex items-center gap-2">
        <button 
          className="p-2 rounded-full hover:bg-gray-200/50 transition-colors"
          disabled={disabled}
        >
          <Mic className="w-5 h-5 text-gray-500" />
        </button>
        {message.trim() && (
          <button 
            onClick={handleSend}
            disabled={disabled}
            className="p-2 rounded-full bg-primary hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
