import { FormEvent, useMemo, useState } from "react";
import { MessageSquareText, SendHorizontal, UserRound } from "lucide-react";

import { chatWithAgent } from "@/api/siteApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  SelectedLocation,
  SiteAnalysisResult,
} from "@/types/site";

const suggestedQuestions = [
  "Assess this location",
  "What infrastructure is missing?",
  "Compare public benefits",
  "What should the city do first?",
];

interface AgentChatPanelProps {
  selectedLocation: SelectedLocation | null;
  analysis: SiteAnalysisResult | null;
}

export function AgentChatPanel({
  selectedLocation,
  analysis,
}: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-agent-message",
      role: "assistant",
      content:
        "Select a candidate site, then ask the planning assistant to explain the infrastructure tradeoffs in plain language.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const statusLabel = useMemo(() => {
    if (!selectedLocation) {
      return "Awaiting site selection";
    }
    if (!analysis) {
      return "Ready for analysis";
    }
    return `${analysis.suitability.score}/100 readiness`;
  }, [analysis, selectedLocation]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isThinking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await chatWithAgent(
        trimmed,
        analysis,
        Boolean(selectedLocation)
      );
      setMessages((current) => [...current, response]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <Card className="flex min-h-[620px] flex-col rounded-xl shadow-none xl:h-[calc(100vh-132px)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Planning assistant
          </CardTitle>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ask for a plain-language explanation of risks, sequencing, and public
          benefit.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((question) => (
            <Button
              key={question}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto rounded-full whitespace-normal px-3 py-2 text-left text-xs"
              onClick={() => void sendMessage(question)}
            >
              {question}
            </Button>
          ))}
        </div>

        <ScrollArea className="min-h-[340px] flex-1 rounded-xl border bg-background/35 p-4">
          <div className="space-y-4 pr-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-secondary/70">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[86%] rounded-xl border px-4 py-3 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "bg-card/80 text-slate-200"
                      : "border-primary/35 bg-primary/14 text-slate-50"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-primary/12">
                    <UserRound className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="rounded-lg border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                Reviewing the current readiness report...
              </div>
            )}
          </div>
        </ScrollArea>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this site's infrastructure readiness..."
            className="min-h-[64px] resize-none rounded-xl"
          />
          <Button
            type="submit"
            size="icon"
            className="h-[64px] w-12 shrink-0"
            disabled={!input.trim() || isThinking}
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
