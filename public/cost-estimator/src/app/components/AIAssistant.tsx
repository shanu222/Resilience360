import { X, Send, Sparkles } from "lucide-react";
import { useState } from "react";

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant({ open, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI Construction Assistant. I can help you with cost estimation, material optimization, risk analysis, and more. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'm analyzing your construction project. Based on the current data, I recommend optimizing material procurement to reduce costs by 12%.",
        "For this project, I suggest using alternative materials that could save approximately $15,000 while maintaining quality standards.",
        "The risk analysis shows a medium weather delay risk. I recommend adding 2 weeks to the timeline and allocating a 5% contingency budget.",
        "I've calculated the cost breakdown. Would you like me to generate a detailed BOQ report?",
      ];
      const assistantMessage: Message = {
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);

    setInput("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Construction Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about cost estimation, materials..."
            className="flex-1 px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setInput("Estimate cost for this project")}
            className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/70 transition-colors"
          >
            Estimate cost
          </button>
          <button
            onClick={() => setInput("Optimize materials")}
            className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/70 transition-colors"
          >
            Optimize materials
          </button>
          <button
            onClick={() => setInput("Analyze risk")}
            className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/70 transition-colors"
          >
            Analyze risk
          </button>
        </div>
      </div>
    </div>
  );
}
