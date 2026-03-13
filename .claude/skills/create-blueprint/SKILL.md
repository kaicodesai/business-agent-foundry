# Skill: create-blueprint

**Invocation:** `/create-blueprint`

---

## Purpose

Start a structured discovery session and produce a complete business blueprint
from scratch. Delegates to `blueprint-agent` in CREATE mode.

Use this skill when no blueprint exists yet. It walks the user through 12
discovery sections and writes both output files when complete.

---

## When to Use

- `docs/blueprints/business-blueprint.json` does not exist
- Starting a blueprint for a new client, new business, or new business type
- User says: "create a blueprint", "start a blueprint", "document this business"

Do **not** use this skill if a blueprint already exists — use `/improve-blueprint`
instead, which preserves existing data.

---

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| Business name | Optional | User provides in conversation |
| Business type | Optional | User provides; defaults to `ai_automation_agency` |
| Any context | Optional | Paste pitch deck, notes, Notion docs, etc. |

If the user provides raw context (a website URL, existing docs, notes), absorb
it before starting the discovery interview to pre-fill what you already know.
Ask only for what's still missing.

---

## Execution Steps

1. **Check for existing blueprint.**
   Run: `ls docs/blueprints/business-blueprint.json 2>/dev/null`
   If found, warn the user and offer to switch to `/improve-blueprint`.

2. **Load the schema.**
   Read `.claude/templates/blueprint-schema.json` to know which fields are
   required and what values are valid.

3. **Absorb any provided context.**
   If the user pastes notes or docs, extract known fields before asking
   questions.

4. **Hand off to `blueprint-agent` in CREATE mode.**
   Pass any pre-extracted context. The agent runs the 12-section discovery
   interview in order, summarising after each section before proceeding.

5. **Agent writes output files.**
   `blueprint-agent` produces both files when all sections are complete.

6. **Run structural validation.**
   After files are written, run:
   `.claude/hooks/validate-blueprint.sh docs/blueprints/business-blueprint.json`
   Display the result inline.

7. **Offer next step.**
   Present the user with two options:
   - "Run `/audit-blueprint` for a full quality check."
   - "Run `/extract-agent-map` to generate the agent map and build priority."

---

## Outputs

| File | Description |
|------|-------------|
| `docs/blueprints/business-blueprint.json` | Machine-readable blueprint. Must conform to `.claude/templates/blueprint-schema.json`. |
| `docs/blueprints/business-blueprint.md` | Human-readable narrative with TL;DR, Mermaid agent map, and Next Actions section. |

Both files are created by `blueprint-agent`. Do not write them directly from
this skill.

---

## Handoff

**Primary agent:** `blueprint-agent` (CREATE mode)
**Post-run options:**
- → `/audit-blueprint` if the user wants a quality check before proceeding
- → `/extract-agent-map` if completeness is sufficient and they're ready to plan

---

## Notes

- If the user can only answer some sections today, still generate the files
  with `"[TO BE CONFIRMED]"` for unknown fields. A partial blueprint is better
  than no blueprint. Gaps are documented in `gaps[]` and surfaced in the
  Markdown output.
- `meta.business_type` drives validation rules. If set to anything other than
  `ai_automation_agency`, domain-specific heuristics in `blueprint-agent` will
  not apply, but the schema and structural checks still work.
- Reusable for any business type — just set `meta.business_type` accordingly.
