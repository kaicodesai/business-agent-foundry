# Skill: improve-blueprint

**Invocation:** `/improve-blueprint`

---

## Purpose

Read an existing business blueprint, identify what's weak or missing, and
apply targeted improvements. Delegates to `blueprint-agent` in IMPROVE mode.

This skill preserves everything already in the blueprint and adds to it — it
does not restart from scratch.

---

## When to Use

- `docs/blueprints/business-blueprint.json` already exists
- `/audit-blueprint` returned `NEEDS WORK` or `BLOCKED`
- A specific section feels thin, outdated, or was skipped during creation
- Business circumstances changed (new pricing, new service, new ICP)
- User says: "update the blueprint", "improve the blueprint", "add X to the
  blueprint", "the blueprint needs work"

---

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| `docs/blueprints/business-blueprint.json` | **Required** | Must exist on disk |
| `docs/blueprints/business-blueprint.md` | Recommended | Read alongside JSON |
| Audit report | Optional | Output from a previous `/audit-blueprint` run |
| Specific section to fix | Optional | User can name it: "fix the pricing section" |
| New information | Optional | User pastes updated context |

If a validator report from `/audit-blueprint` is available (user pastes it in
or a file exists), use it as the primary improvement agenda rather than
re-deriving gaps from scratch.

---

## Execution Steps

1. **Verify the blueprint exists.**
   Read `docs/blueprints/business-blueprint.json`.
   If missing, stop and instruct the user to run `/create-blueprint` first.

2. **Load the schema.**
   Read `.claude/templates/blueprint-schema.json` to check required fields
   and valid values.

3. **Check for an existing audit report.**
   Look for any validator output the user has pasted or referenced. If found,
   use the FAIL and WARN items as the prioritised improvement list.

4. **Hand off to `blueprint-agent` in IMPROVE mode.**
   Pass the existing JSON, any audit findings, and any new user-provided
   context. The agent:
   - Identifies CRITICAL / QUALITY / OPTIONAL gaps
   - Presents the improvement plan to the user for confirmation
   - Asks the user to confirm, skip, or redirect each category
   - Applies only confirmed changes
   - States clearly what changed and why before writing

5. **Agent overwrites output files.**
   `blueprint-agent` updates both files in place, bumping
   `meta.last_updated_at` to today's date.

6. **Run structural validation.**
   After files are written, run:
   `.claude/hooks/validate-blueprint.sh docs/blueprints/business-blueprint.json`
   Display the result inline.

7. **Offer next step.**
   - If validation passed: offer `/audit-blueprint` for deep quality check.
   - If validation failed: surface the failures and offer to fix them now.

---

## Outputs

| File | Description |
|------|-------------|
| `docs/blueprints/business-blueprint.json` | Updated in place. `meta.last_updated_at` reflects today. |
| `docs/blueprints/business-blueprint.md` | Regenerated from updated JSON. |

Both files are written by `blueprint-agent`. This skill does not write files
directly.

---

## Handoff

**Primary agent:** `blueprint-agent` (IMPROVE mode)
**Pre-run input (optional):** output of `blueprint-validator` agent
**Post-run options:**
- → `/audit-blueprint` to revalidate after changes
- → `/extract-agent-map` if the blueprint now passes downstream usability

---

## Notes

- Always read both JSON and Markdown before improving — the Markdown sometimes
  contains narrative context that didn't make it into the JSON.
- If the user provides a specific section to improve (e.g. "update pricing"),
  scope the improvement to that section only. Do not touch other sections
  unless they are directly inconsistent with the change.
- Never downgrade or remove existing data without explicit user confirmation.
  Improvements add or refine; they do not delete.
- If `meta.status` is `approved`, warn the user before making any changes.
  Improvements should reset status to `in_review`.
