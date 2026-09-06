export interface DocumentSummary {
  slug: string;
  name: string;
  description: string;
}

export type GenericFields = Record<string, string | null>;

export interface GenericChatResult {
  reply: string;
  fields: GenericFields;
  complete: boolean;
  markdown: string;
}

export interface RouteResult {
  matched_slug: string | null;
  suggested_slug: string;
  reply: string;
}

export function suggestedGenericFilename(name: string): string {
  const base = name.trim().replace(/[^a-zA-Z0-9-]+/g, "-") || "Document";
  return `${base}.md`;
}
