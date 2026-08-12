1. Uncompressed Json

2. Illogical DB write methods

3. Single-dependency bottleneck (audit roundtrip latency)

4. Un-optimistic rendering

5. Non-statically hosted site.

# SOMETHING TO CONSIDER:

database → neon, not supabase (idle = $0)
hosting → cloudflare, not vercel (unlimited free bandwidth)
files → r2, not s3 ($0 egress)
build → claude code or codex ($20)
