# [PA] QA Agent Scope

For: workflow-builder-agent / n8n workflow registry
Workflow ID: `fpLHEghef9u4yUpY`
Status: built inactive, pending owner activation

---

## Purpose

Automatically checks workflow-builder output before anything is copied into the
client n8n. The QA workflow is the gate between generated staging workflows and
`qa.pass`.

It does not activate workflows, fix workflows, or make owner decisions.

---

## Trigger

Native n8n sub-workflow trigger:

- First node: `When Executed by Builder`
- Type: `n8n-nodes-base.executeWorkflowTrigger`
- Input mode: passthrough / accept all data
- Called by Workflow Builder node: `Call QA Agent`
- Parent node type: `n8n-nodes-base.executeWorkflow`
- Workflow ID: `fpLHEghef9u4yUpY`

The workflow can remain inactive while it is used as a sub-workflow. Workflow
Builder must wait for the sub-workflow to complete and consume the returned
QA JSON from the final node.

---

## Required Input

```json
{
  "client_slug": "example-client",
  "company_name": "Example Client",
  "staging_workspace_id": "https://kaiashley.app.n8n.cloud",
  "target_n8n_workspace_id": "https://client.app.n8n.cloud",
  "workflows": [
    {
      "id": "deployed-workflow-id",
      "staging_id": "deployed-workflow-id",
      "staging_url": "https://kaiashley.app.n8n.cloud/workflow/deployed-workflow-id",
      "name": "Application Triage",
      "trigger": "New Typeform submission",
      "expected_output": "Decision email plus CRM record",
      "workflow_json": {
        "name": "[QA STAGING] example-client - Application Triage",
        "nodes": [],
        "connections": {},
        "settings": {
          "executionOrder": "v1"
        }
      },
      "test_evidence": {
        "end_to_end": "PASS",
        "synthetic_data": true,
        "execution_id": "optional",
        "summary": "Synthetic Typeform payload routed to ACCEPT and produced expected output."
      },
      "qa_test": {
        "allow_live_test": false,
        "url": "",
        "payload": {}
      }
    }
  ]
}
```

---

## Checks Performed

- Staged workflow ID and full workflow JSON exist.
- Trigger node exists.
- Workflow is inactive before owner activation.
- No disabled production nodes.
- `settings.errorWorkflow` is configured.
- Retry limits are not greater than 2.
- Obvious raw credential/token patterns are not present in workflow JSON.
- Integration/API nodes have credential references where applicable.
- Builder supplied end-to-end PASS evidence, when available.
- Builder confirmed synthetic/representative test data.
- Optional safe QA webhook test is run only when explicitly allowed.
- Report email is sent to Kai with verdict, failures, owner-verify items, and
  cleanup/removal list for staged workflows/sample credentials.

---

## Output

Returns JSON:

```json
{
  "verdict": "QA PASS | QA CONDITIONAL PASS | QA FAIL | QA BLOCKED",
  "client_slug": "example-client",
  "workflow_count": 1,
  "failure_count": 0,
  "recommended_project_status": "qa.pass",
  "ready_to_patch_to_client": true,
  "results": [],
  "qa_report_summary": {
    "failures": [],
    "owner_verify": []
  }
}
```

The builder consumes this response and updates Airtable:

- `QA PASS` / `QA CONDITIONAL PASS` -> `project_status = qa.pass`
- `QA FAIL` / `QA BLOCKED` -> `project_status = qa.fail`

---

## Known Limitation

n8n workflow JSON inspection is reliable. Automatic execution is only reliable
when the generated workflow provides a safe QA webhook/test trigger or when the
builder supplies execution evidence from its own test run. For manual/schedule
triggers without a safe test endpoint, QA returns an owner-verify execution item
instead of pretending it executed the workflow.
