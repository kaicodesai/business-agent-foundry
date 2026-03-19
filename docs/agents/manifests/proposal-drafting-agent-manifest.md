# Tool Manifest — proposal-drafting-agent
Date: 2026-03-15

## Claude tools
Read, Write, Bash

## n8n nodes required
None — this agent runs in Claude Code, not n8n.

## External APIs required
- Anthropic API — claude-sonnet-4-6 — Status: AVAILABLE (Claude Code environment)
- Airtable API — airtable-phoenix-automation — Status: DEFERRED (used to read lead context; graceful fallback if unavailable)

## n8n workflow needed: NO
## Workflow build scope needed: NO

## Manifest verdict: CLEAR (Claude tools always available; Airtable read is optional enrichment — agent proceeds without it if unavailable)
