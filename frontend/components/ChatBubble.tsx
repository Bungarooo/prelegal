export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? "bg-[#209dd7] text-white" : "bg-neutral-100 text-neutral-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
