
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[320px] bg-background border-l border-border shadow-lg animate-fade-in z-10">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Meeting chat</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>
      
      <ScrollArea className="h-[calc(100vh-130px)] p-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground p-4">
              No messages yet. Start a conversation!
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{message.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm mt-1 p-2 bg-secondary rounded-md">
                  {message.text}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!messageInput.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
