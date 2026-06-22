import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  HumanReviewRecord,
  InfrastructureIntent,
  ScenarioType,
  SelectedLocation,
  SiteAnalysisResult,
} from "@/types/site";

const suggestedQuestions = [
  "What is around this location?",
  "What facilities are nearby?",
  "Can we build AI infrastructure here?",
  "Can we build a data center here?",
  "Where should we place edge AI nodes?",
  "What should we invest in first?",
  "Is this area ready for healthcare AI?",
  "What if we upgrade fiber?",
  "What should a human validate first?",
  "Generate a reviewer checklist.",
  "Generate a strategic roadmap.",
];

interface AgentChatPanelProps {
  selectedLocation: SelectedLocation | null;
  analysis: SiteAnalysisResult | null;
  review: HumanReviewRecord | null;
  activeLayers: string[];
  planningFocus: InfrastructureIntent;
  scenario: ScenarioType;
}

export function AgentChatPanel({
  selectedLocation,
  analysis,
  review,
  activeLayers,
  planningFocus,
  scenario,
}: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-agent-message",
      role: "assistant",
      content:
        "Click a location or choose a candidate zone, then ask about nearby infrastructure, facilities, risks, and AI readiness.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const statusLabel = useMemo(() => {
    if (!selectedLocation) {
      return "Awaiting site selection";
    }
    if (!analysis) {
      return "Ready for analysis";
    }
    return `${analysis.suitability.score}/100 readiness`;
  }, [analysis, selectedLocation]);

  const thinkingMessage = useMemo(() => {
    if (waitSeconds >= 12) {
      return "OpenAI is taking longer than usual. The backend will return a tool-grounded fallback if needed...";
    }
    if (waitSeconds >= 5) {
      return "Waiting for backend evidence tools and the LLM explanation...";
    }
    return "Checking selected map evidence and score drivers...";
  }, [waitSeconds]);

  useEffect(() => {
    if (!isThinking) {
      setWaitSeconds(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setWaitSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isThinking]);

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
    setWaitSeconds(0);

    try {
      const response = await chatWithAgent(
        trimmed,
        {
          selectedLocation,
          analysis,
          review,
          activeLayers,
          scenario,
          planningFocus,
        }
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

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <Card className="flex min-h-[620px] flex-col rounded-[22px] shadow-none xl:h-full xl:min-h-0 xl:overflow-hidden">
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
          benefit across compute, connectivity, data, governance, AI literacy,
          and sector readiness.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
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

        <ScrollArea className="min-h-[340px] flex-1 rounded-[20px] border bg-[#fbf8f1] p-4 xl:min-h-0">
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
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-secondary/80">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[86%] overflow-hidden rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm",
                    message.role === "assistant"
                      ? "border-border bg-card text-foreground"
                      : "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  <ChatMessageContent
                    content={message.content}
                    isAssistant={message.role === "assistant"}
                  />
                </div>
                {message.role === "user" && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-primary/10">
                    <UserRound className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
                {thinkingMessage}
              </div>
            )}
          </div>
        </ScrollArea>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask about the selected map location, nearby facilities, or readiness..."
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

function ChatMessageContent({
  content,
  isAssistant,
}: {
  content: string;
  isAssistant: boolean;
}) {
  if (!isAssistant) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <div className="space-y-2 break-words">
      {renderAssistantContent(content)}
    </div>
  );
}

function renderAssistantContent(content: string) {
  const blocks: ReactNode[] = [];
  const listItems: ReactNode[] = [];

  function flushList() {
    if (!listItems.length) {
      return;
    }
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="ml-4 list-disc space-y-1 text-[13px] leading-relaxed"
      >
        {listItems.splice(0).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push(
        <p
          key={`heading-${index}`}
          className="pt-1 text-[13px] font-semibold text-primary"
        >
          {renderInlineMarkdown(heading[1])}
        </p>
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(renderInlineMarkdown(bullet[1]));
      return;
    }

    flushList();
    blocks.push(
      <p key={`paragraph-${index}`} className="text-[13px] leading-relaxed">
        {renderInlineMarkdown(stripMarkdownRule(line))}
      </p>
    );
  });

  flushList();
  return blocks.length ? blocks : content;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function stripMarkdownRule(line: string) {
  return line.replace(/^[-=]{3,}$/, "");
}
