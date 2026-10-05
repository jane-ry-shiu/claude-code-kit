# Spec Conversion

Provide field values to `jira` skill for creating or updating a Jira ticket that tracks high-level → low-level spec conversion.

## Additional Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Target project path | ✅ | e.g. `packages/app-vsaas-portal` |
| Jira issue key | Only for update | e.g. `VOR-123` — if provided, triggers update flow |

## Sub-flow Routing

No issue key → **Create Flow**. Has issue key → **Update Flow**.

## Create Flow

1. Extract `change-id` from spec path (last directory segment)
2. Extract `project-name` from project path (last directory segment)
3. Provide field values to `jira` skill's [description-format](../../jira/references/description-format.md):
   - **Summary**: `[platform][docs] transform high level spec to low level spec (<change-id>)`
   - **Field values**:
     - references: `High-Level Spec: <high-level-spec-path>`
     - scope: Transform high-level spec into low-level spec for target project. High-Level Spec path: `<path>`. Target project path: `<path>`
     - task_list:
       1. Read high-level spec (proposal.md and all specs under specs/)
       2. Understand target project architecture
       3. Transform high-level spec into low-level spec; output tasks should be independent and parallelizable
     - scope_boundary_in: High-level spec → low-level spec conversion
     - scope_boundary_out: Actual code implementation
     - done_criteria: Low-level spec covers all high-level spec scenarios and each task is independently executable. No high-level spec scenario is left unaddressed.
     - review_guideline: Review completeness and executability of low-level spec. Verify full coverage against high-level spec. 驗證 Done Criteria 中每個條件都被完整涵蓋。Review scope limited to spec conversion (in scope), not code implementation (out of scope)
4. Delegate to `jira` skill's create-ticket flow (draft → Quality Gate → user confirm → create)
5. Report ticket key to user

## Update Flow

1. Read current ticket description via `jira` skill (read-ticket)
2. Re-read high-level spec files (proposal.md, specs/)
3. Re-generate all field values using the same templates as create flow
4. Compare generated vs current — field-by-field comparison of values (references, scope, task_list, done_criteria, scope_boundary_in/out, review_guideline), ignoring whitespace and formatting differences. If any field has a substantive content change, proceed to step 5. Otherwise report "no changes needed" and stop.
5. Delegate to `jira` skill's update-ticket flow (present diff → user confirm → update)
