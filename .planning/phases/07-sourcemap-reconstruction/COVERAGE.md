# API Coverage — Phase 07 (sourcemap-reconstruction)

No external API integration: this phase reconstructs sources from `data:` URI sourcemaps already
present in an intercepted response body, and D-01 refuses every outbound fetch by design — no `.map`
file is fetched, looked up or resolved, and gap-closure round 3 changes only comments and one spec
file.

> The detector returned `detected: true` on a single signal — the words `the Win32 API` inside
> `export.ts`'s docblock argument about RFC 3986 reserved characters, quoted in `07-22-PLAN.md`. That
> is prose about URI syntax, not an integration. Re-read of the phase scope confirms there is no
> external API, SDK, endpoint or webhook anywhere in it, so a fabricated capability matrix would
> assert coverage decisions about a surface that does not exist.
