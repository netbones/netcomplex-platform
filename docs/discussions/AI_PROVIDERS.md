# The question is: does Vercel AI SDK replace the custom provider layer, and is it worth migrating?

Key considerations:

- The current abstraction is only ~120 lines of provider code + ~80 lines of factory code, so not huge
- The real complexity is in the quota/pool/billing system, which Vercel AI SDK doesn't help with
- Vercel AI SDK doesn't have native quota management
- Current setup has no streaming or tool calling - if those become needed, Vercel AI SDK would save substantial work
- The Vercel AI SDK's biggest value is in: streaming, tool calling, agents, structured output, and frontend hooks (useChat)
- For the current use case (simple text completions with JSON mode), the custom approach is fine

Let me think about what specific benefits/drawbacks exist:

## Benefits of Vercel AI SDK:

1. Streaming: If you ever need SSE streaming (chat, real-time responses), Vercel handles this with streamText + createUIMessageStreamResponse
2. Tool calling: Built-in tool() with Zod schemas, auto-retry, multi-step
3. Structured output: Output.object() works across providers (Anthropic doesn't have native JSON mode like OpenAI, so Vercel handles the differences)
4. Frontend integration: useChat, useCompletion, useObject hooks for React
5. Provider registry: Manage multiple providers with string IDs like 'openai/gpt-4o' or 'anthropic/claude-sonnet-4-20250514'
6. Middleware: For logging, caching, retry, etc.
7. Future-proofing: Adding new providers (Google, Mistral, etc.) is just an install
8. One less abstraction to maintain: your custom AiProvider interface gets replaced by a well-maintained standard

## Drawbacks:

1. Migration work: Need to refactor all consumers, update the quota system to work with Vercel's API
2. Version churn: Vercel AI SDK is at v5 (v6 beta), they've had breaking changes
3. Vendor lock-in concern: Though it's open source, the design is opinionated around Vercel/Next.js patterns
4. Your current custom abstraction is only ~200 lines: It's small enough to maintain
5. The quota system is the real complexity: Vercel AI SDK doesn't help with this
6. No immediate need: Current features (translate, dispute screen) don't need streaming or tools

## Overall assessment: Given the current state of the project (only 2 AI consumers, no streaming/tool needs), the benefits are moderate but the migration cost is non-trivial. The custom abstraction is small and works. However, if you anticipate adding:

- Chat-like features with streaming
- AI agents with tool use
- More providers
- Frontend components that stream AI responses

Then the Vercel AI SDK would become a clear win.

Here's the comparison based on the codebase analysis:

### Current Setup

- ~200 lines of custom abstraction (AiProvider interface + AnthropicProvider + OpenAiProvider)
- 2 consumers: translate route + dispute intake screen
- No streaming, no tool calling, no frontend AI hooks
- The real complexity is your quota/pool/billing layer (8 DB tables, cron rollover, admin routes) — which Vercel AI SDK doesn't replace

### What Vercel AI SDK Would Add

Feature
Multi-provider abstraction
Streaming (SSE)
Tool calling
Structured output
Frontend hooks
Middleware/retry/logging
Agent loops
Adding new providers

## Verdict

Not worth migrating right now. Your abstraction is small, well-built, and covers the current use case (simple text completions). The quota system is the real asset and isn't Vercel-replaceable.
Consider adopting Vercel AI SDK when you hit any of:

- Streaming chat UI
- Tool-using AI agents
- More than 2-3 providers
- Frontend needs useChat hooks

If you do adopt later, you'd swap the AiProvider layer for Vercel's generateText/streamText while keeping your quota/pool/billing layer intact — they're orthogonal concerns.
