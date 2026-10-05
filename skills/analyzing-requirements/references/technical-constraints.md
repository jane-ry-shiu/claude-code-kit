# Technical Constraints

**Verify against the real system — do not reason in the abstract.** When agents only reason from the spec they miss real limits; when they open the actual API/schema and data, they find them. So open the real thing.

- **API:** does the existing/real API support what the feature needs? Record shortfalls + required workarounds (e.g. no search keyword / no site filter → client-side + short-circuit).
- **Data:** counts and limits checked with real data (e.g. device-selection cap; a selection that can implicitly exceed a cap).

Classify findings: `technical-constraint` / `known-limitation` / `phasing`.
