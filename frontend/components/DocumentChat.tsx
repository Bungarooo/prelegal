"use client";

import { useState } from "react";
import ChatBubble, { type ChatMessage } from "@/components/ChatBubble";
import type { GenericChatResult, GenericFields } from "@/lib/documents";

export default function DocumentChat({
  slug,
  name,
  fields,
  onChange,
}: {
  slug: string;
  name: string;
  fields: GenericFields;
  onChange: (fields: GenericFields, markdown: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'll help you put together your ${name}. Tell me about the parties involved to get started.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: "user", content } satisfies ChatMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const response = await fetch(`/api/documents/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fields }),
      });
      if (!response.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const body: GenericChatResult = await response.json();
      setMessages([...nextMessages, { role: "assistant", content: body.reply }]);
      onChange(body.fields, body.markdown);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((message, i) => (
          <ChatBubble key={i} message={message} />
        ))}
        {sending && <ChatBubble message={{ role: "assistant", content: "…" }} />}
      </div>

      {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-200 p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          aria-label="Chat message"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-[#753991] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#753991]/40 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
