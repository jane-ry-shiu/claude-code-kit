# Spec Document Reviewer — Improvement Checklist

## P0 — Critical Improvements

- [x] ~~**Add Security Review role**~~ — DROPPED as standalone role
  - Permission/access control rules → add to Logic Review
  - Multi-tenant data visibility scope → add to Logic Review
  - Destructive/sensitive operation confirmation → add to UX Review (Feedback and Affordance)

- [ ] **Add optional project context input mechanism**
  - Accept optional Confluence URL or project path as background — read before review starts
  - No questionnaire, no forced prompts — user provides it or skip
  - Add as optional step in Dispatch Table after "Read document"

## P1 — High-Value Improvements

- [x] ~~**Add Comprehensive mode**~~ — DROPPED
  - User prefers one role per invocation; output files are intentionally separate to avoid overwrite issues

- [x] ~~**Add Executive Summary + Maturity Rating to output**~~ — DROPPED
  - Severity summary already sufficient; single-role maturity rating could mislead

- [x] ~~**Add Top 3 Priority section to output**~~ — DROPPED
  - When Critical/High ≤ 3, severity headings already sufficient; when more, reviewer judgment varies too much to formalize

- [x] ~~**Patch existing Logic Review checklist**~~ — DROPPED
  - All 3 proposed items (feature dependencies, rollback/migration, feature flags) are RD implementation concerns, not PM spec scope

- [x] **Patch existing Technical Clarity Review checklist**
  - ~~Monitoring / observability~~ — DROPPED, covered by existing Error Handling + out of PM spec scope
  - Backward compatibility impact — ADDED to Integration Points section
  - ~~Deployment considerations~~ — DROPPED, RD/DevOps concern

- [x] **Patch existing UX Review checklist**
  - ~~i18n / multi-language~~ — DROPPED
  - ~~Responsive / multi-device~~ — DROPPED
  - ~~Offline / degraded mode~~ — DROPPED, covered by Technical Clarity's Error Handling + Integration Points
  - Notification channel — ADDED to Feedback and Affordance section

- [ ] **Patch existing Proofreading Review checklist**
  - Diagram vs. text consistency — KEEP
  - Internal cross-reference integrity — KEEP
  - ~~Version / date metadata check~~ — DROPPED, document management concern, Confluence handles versioning

## P2 — Valuable Additions

- [ ] **Add Testability Review role**
  - Can QA derive test cases from spec?
  - Are acceptance criteria explicit and verifiable?
  - Are boundary conditions testable?
  - Create `references/testability-review.md`

- [ ] **Add positive feedback mechanism**
  - Note well-written sections alongside findings
  - Improves review acceptance and sets quality baseline

## P3 — Future Enhancements

- [ ] **Diff review for revised specs**
  - Focus review on changed sections after spec revision
  - Leverage Confluence version diff if source is Confluence

- [ ] **Findings tracking across sessions**
  - Compare current review against previous analysis-context saved file
  - Mark findings as addressed / still open

- [ ] **Jira integration**
  - Auto-create Jira issues from Critical/High findings

- [ ] **Confluence integration**
  - Post review summary as comment on spec page
