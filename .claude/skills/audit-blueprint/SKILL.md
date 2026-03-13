# Skill: audit-blueprint

**Invocation:** `/audit-blueprint`

---

## Purpose

Run a two-stage quality audit on the current business blueprint:

1. **Stage 1 — Structural (fast):** `validate-blueprint.sh` checks all
   required sections and referential integrity. Exits in seconds.
2. **Stage 2 — Semantic (deep):** `blueprint-validator` agent checks
   completeness scoring, clarity, logical consistency, and downstream
   usability.

Produces a structured `APPROVED / NEEDS WORK / BLOCKED` verdict with
actionable findings per dimension.

---

## When to Use

- After `/create-blueprint` or `/improve-blueprint` produces new output
- Before promoting `meta.status` from `draft` → `in_review` → `approved`
- Before running `/extract-agent-map` (requires usability PASS)
- Any time the user wants a quality gate on the blueprint
- User says: "audit the blueprint", "check the blueprint", "validate the
  blueprint", "is the blueprint ready?"

---

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| `docs/blueprints/business-blueprint.json` | **Required** | Must exist on disk |
| `docs/blueprints/business-blueprint.md` | Recommended | Cross-checked for consistency with JSON |
| `.claude/templates/blueprint-schema.json` | **Required** | Read by validator agent |

If `business-blueprint.json` is missing, stop immediately. Instruct the user
to run `/create-blueprint` first.

---

## Execution Steps

1. **Verify the blueprint exists.**
   Check for `docs/blueprints/business-blueprint.json`.
   If missing, stop with a clear error.

2. **Stage 1: Run structural hook.**
   ```
   .claude/hooks/validate-blueprint.sh docs/blueprints/business-blueprint.json
   ```
   Display full output inline.
   - Exit code `0`: proceed to Stage 2.
   - Exit code `1`: show failures, offer to stop here or continue to Stage 2
     anyway for full diagnostics.
   - Exit code `2`: prerequisites missing — fix before continuing.

3. **Stage 2: Hand off to `blueprint-validator` agent.**
   Pass the blueprint files and schema path. The agent runs all four
   validation dimensions in sequence:
   - Dimension 1: Completeness (required field coverage %)
   - Dimension 2: Clarity (semantic quality checks)
   - Dimension 3: Logical Consistency (cross-field arithmetic + references)
   - Dimension 4: Downstream Usability (agent-map and build-priority extractability)

4. **Display the full validation report.**
   The report uses the standard format defined in `blueprint-validator.md`.
   Do not truncate it.

5. **Deliver verdict and offer next step.**
   Based on the overall result:

   | Verdict | Next Step Offered |
   |---------|-------------------|
   | `APPROVED` | `/extract-agent-map` to generate downstream files |
   | `NEEDS WORK` | `/improve-blueprint` targeting the WARN items |
   | `BLOCKED` | `/improve-blueprint` targeting the FAIL items first |

---

## Outputs

| Output | Format | Written to disk? |
|--------|--------|-----------------|
| Stage 1 structural report | Terminal | No (unless user requests) |
| Stage 2 validation report | Terminal | No by default |
| Saved audit report | `docs/blueprints/audit-report-[date].md` | Only if user asks |

To save the report, the user can say "save the audit report". Write it to
`docs/blueprints/audit-report-YYYY-MM-DD.md` using the same structured
format as the terminal output.

---

## Verdict Rules

Determined by `blueprint-validator` agent:

| Verdict | Condition |
|---------|-----------|
| `APPROVED` | Zero FAILs, fewer than 3 WARNs across all dimensions |
| `NEEDS WORK` | Zero FAILs, 3 or more WARNs |
| `BLOCKED` | One or more FAILs in any dimension |

`APPROVED` does **not** automatically change `meta.status` in the JSON.
The user must explicitly confirm promotion via `/improve-blueprint` or
direct edit.

---

## Handoff

**Primary agent:** `blueprint-validator`
**Pre-run tool:** `.claude/hooks/validate-blueprint.sh` (Stage 1)
**Post-run options:**
- → `/improve-blueprint` if verdict is `NEEDS WORK` or `BLOCKED`
- → `/extract-agent-map` if verdict is `APPROVED`

---

## Notes

- Run Stage 1 (shell hook) every time, even if the user only asks for the
  "deep" audit. Structural failures invalidate semantic analysis.
- If the user asks for a "quick check", run only Stage 1 and summarise the
  results. Offer Stage 2 as a follow-up.
- The audit is read-only. It never modifies blueprint files. All fixes go
  through `blueprint-agent` via `/improve-blueprint`.
- Reusable for any `business_type` — the validator applies type-specific
  recommended fields based on `meta.business_type` in the JSON.
