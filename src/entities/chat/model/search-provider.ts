export interface SearchResult {
  messageId: string;
  conversationId: string;
  snippet: string;
  createdAt: string;
}

export interface MessageSearchProvider {
  search(
    tenantId: string,
    userId: string,
    query: string,
    conversationId?: string
  ): Promise<SearchResult[]>;
}
