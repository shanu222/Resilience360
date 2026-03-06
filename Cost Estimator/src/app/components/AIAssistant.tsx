import { X, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { askEstimatorAssistant } from "../services/costEstimatorApi";
import { buildAssistantReply } from "../services/realtimeAi";
import { useEstimator } from "../state/estimatorStore";

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

export function AIAssistant({ open, onClose }: AIAssistantProps) {
  const { state, addAssistantMessage } = useEstimator();
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const now = new Date().toISOString();
    const prompt = input.trim();
    addAssistantMessage({
      id: `${Date.now()}-user`,
      role: "user",
      content: prompt,
      createdAt: now,
    });

    setIsThinking(true);
    try {
      const response = await askEstimatorAssistant({
        prompt,
        state,
      });

      addAssistantMessage({
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.reply,
        createdAt: new Date().toISOString(),
      });
    } catch {
      const riskIndex = Math.min(95, Math.max(20, Math.round(35 + state.takeoffConfidence * 0.45)));
      const reply = buildAssistantReply(prompt, {
        uploadedCount: state.uploadedFiles.length,
        costItems: state.costItems,
        riskIndex,
      });

      addAssistantMessage({
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsThinking(false);
    }

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
        {state.assistantMessages.map((message) => (
          <div
            key={message.id}
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
        {isThinking && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted text-foreground">
              <p className="text-sm">Analyzing live project data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
            placeholder="Ask about cost estimation, materials..."
            className="flex-1 px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => void handleSend()}
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
