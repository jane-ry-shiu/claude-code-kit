---
name: software-design-principles
description: Use when writing, modifying, or reviewing code that involves module/class/function design decisions — enforces SOLID principles and deep module design. Also use when user explicitly requests design review or asks to check code against design principles.
---

# Software Design Principles

## Overview

This skill enforces two complementary bodies of design knowledge:

- **SOLID Principles** — Single Responsibility (SRP), Open-Closed (OCP), Liskov Substitution (LSP), Interface Segregation (ISP), Dependency Inversion (DIP) — the foundational object-oriented design principles that govern module responsibility, extensibility, substitutability, interface segregation, and dependency direction.

- **"A Philosophy of Software Design" Chapters 5-7** — Information Hiding (Ch5), General-Purpose Modules (Ch6), and Different Layer Different Abstraction (Ch7) — concepts that address deep vs. shallow modules, interface generality, and layer abstraction quality.

The skill operates in two modes:

- **Passive Mode**: Silently guides design decisions during normal development using the quick reference table only (reference files are NOT read). When a significant violation is detected — one that would be rated CRITICAL or HIGH in active mode — the skill flags it to the user before proceeding with implementation.

- **Active Mode**: Triggered by explicit user request. Reads detailed reference files (`references/solid-principles.md` and `references/deep-module-design.md`) and performs a structured design review with severity ratings and actionable suggestions.

## Boundaries

### This skill DOES:

- **Passive**: Silently guide module, class, and function design decisions toward sound structural principles. Flag significant violations (CRITICAL or HIGH severity) to the user before proceeding with implementation.

- **Active**: Produce a structured review report with per-violation severity ratings and concrete suggestions. Wait for user confirmation before making any changes.

### This skill does NOT:

- Auto-refactor code without explicit user approval.

- Produce visible output in passive mode unless a significant violation (CRITICAL or HIGH) is detected.

- Replace the `code-reviewer` agent — that agent covers general code quality (naming, complexity, error handling); this skill focuses specifically on structural design decisions.

- Override existing project conventions. If a project has established patterns that diverge from these principles, note the tension but defer to documented project decisions.

- Apply to trivial code (fewer than 20 lines), simple utility functions, or configuration objects where structural analysis adds no value.

### Relationship to existing rules:

- `common/coding-style.md` covers file size limits and organization heuristics (e.g., 800-line max, extract utilities). This skill addresses the deeper structural reasoning — **why** to split a module, not just **when** it exceeds a line threshold.

- `common/patterns.md` covers specific implementation patterns (Repository, API envelope). This skill covers the underlying principles that inform when and why to choose those patterns.

- The `code-reviewer` agent covers general code quality (readability, error handling, naming, complexity). This skill provides the design-principles lens — module boundaries, interface shape, abstraction layers, and dependency direction.

## Trigger Conditions

**Passive mode auto-triggers when:**

- Creating new modules, classes, or functions
- Modifying existing module interfaces or responsibilities
- Refactoring code structure (splitting, merging, or reorganizing modules)

**Active mode triggers when:**

- User explicitly requests a design review (e.g., "review this module's design", "check design principles", "scan this folder for design issues")

**Does NOT trigger when:**

- Pure bug fixes with no structural changes
- Style or copy changes (formatting, wording)
- Configuration file adjustments
- Comment or annotation adjustments
- Trivial code (fewer than 20 lines)

## Passive Mode

| Scenario | Action |
|----------|--------|
| Creating a new module/class | Apply principles silently; if design introduces a significant violation (mixed responsibilities, leaky interface), flag to user before proceeding |
| Modifying an existing interface | Check against ISP, Information Hiding; warn if interface is growing to expose internals or force unused dependencies |
| Refactoring structure | Check for pass-through methods, layer violations, temporal decomposition; suggest corrections inline |
| Adding a new layer/abstraction | Verify it provides a different abstraction level than adjacent layers; flag if it would be a shallow pass-through |

**Self-check before presenting code:** When creating a new module or class, pause before presenting it to the user. Check the design against the quick reference table — specifically SRP (would I need the word "and" to describe this module?) and Information Hiding (does the interface expose internal decisions?). If a significant violation exists, restructure first. Do not present a monolithic class with private helper methods as a substitute for separate modules — private methods do not satisfy SRP if they serve different actors.

When flagging a violation in passive mode, use this format:

> **Design Concern — [Principle Name]**: [One-sentence description of the issue and its consequence]. Recommend [concrete alternative]. Proceed with current approach, or adjust?

## Review Dimensions

When loaded by `code-review`, this dimension must be checked for every applicable file (`.js` and `.vue` `<script>` blocks with 20+ lines of logic). OCP, Information Hiding, and SRP are already covered by the Enclosing-Scope Checkpoint (code-review Step 5a).

1. **Pass-through** — No pass-through methods or variables

## Quick Reference

This table is the primary reference for passive mode. It must be sufficient to identify violations without reading external files.

| Principle | Core | Red Flag |
|-----------|------|----------|
| **SRP** | A module should have only one reason to change | Modifying feature A requires touching file B |
| **OCP** | Extend behavior without modifying existing code | Adding a new type requires changing if/switch chains |
| **LSP** | Substituting implementations must not break caller expectations | Subclass override contradicts interface contract |
| **ISP** | Don't force dependence on unused methods | Consumer needs 3 methods but must depend on an interface with 15 |
| **DIP** | High-level modules depend on abstractions, not concrete implementations | Business logic directly imports a specific HTTP client or DB driver |
| **Information Hiding** | Modules encapsulate design decisions; internals are not exposed in the interface | Multiple modules share knowledge of the same internal detail (file format, protocol, data structure) |
| **General-Purpose Modules** | Generalize interfaces; implement for current needs | Interface contains methods designed for a single scenario (e.g., `backspace()` on a text module) |
| **Different Layer, Different Abstraction** | Adjacent layers should provide different levels of abstraction | Method signature nearly mirrors the lower-layer method it calls (pass-through method) |

### APoSD Vocabulary

**Always use these terms** when flagging issues — both in passive mode flags and active mode reports. Do not substitute vague alternatives like "separation of concerns" when a precise term exists. Using the correct term makes the problem identifiable and the fix actionable:

- **Temporal decomposition** — Organizing modules by execution order rather than by knowledge domain. Leads to information leakage because each step must know about the data format or protocol used by adjacent steps.

- **Information leakage** — The same design decision (format, protocol, algorithm) is embedded in multiple modules instead of being encapsulated in one. The most important red flag in information hiding analysis.

- **Pass-through method** — A method that does little except forward its arguments to another method with a similar signature. Indicates a shallow layer that adds no meaningful abstraction.

- **Pass-through variable** — A variable passed down through multiple layers without being used by intermediate layers. Indicates a leaky abstraction boundary that forces awareness of lower-level concerns.

- **Shallow module** — A module whose interface is nearly as complex as its implementation. Provides little benefit relative to the cost of learning its interface.

- **Deep module** — A module with a simple interface that hides significant implementation complexity. The goal of good module design.

- **Premature decomposition** — Splitting a cohesive piece of logic into multiple functions/modules before there is evidence that the split reduces complexity. Each extracted piece is too shallow to justify its own interface, and the reader must jump across multiple definitions to understand what was originally a single coherent flow. The opposite of the deep module goal — decomposition should hide complexity, not scatter it.

## Active Mode

### Review Workflow

1. **Confirm scope** — Clarify what will be reviewed: a specific file, folder, or module boundary. If the user has not specified, ask before proceeding.

2. **Read target code** — Read all files within the confirmed scope.

3. **Read reference files** — Read `references/solid-principles.md` and `references/deep-module-design.md` for detailed evaluation criteria. If these files do not yet exist, rely on the quick reference table and checklist in this file.

4. **Evaluate against each principle** — Check the target code against all 8 principles in the quick reference table, using the detailed criteria from reference files. For each potential violation, determine severity.

5. **Produce review report** — Document each violation with severity rating and actionable suggestion, using the report format below. The Principle column must use the exact principle name (SRP, OCP, LSP, ISP, DIP, Information Hiding, General-Purpose Modules, Different Layer Different Abstraction). Use APoSD vocabulary terms (temporal decomposition, information leakage, pass-through method/variable, shallow/deep module) in the Issue and Suggestion columns where they apply.

6. **Wait for user confirmation** — Do not make any changes until the user approves specific items from the report. The user may choose to address all items, selected items, or none.

### Report Format

```
### Review Result: [module/file name]

| # | Principle | Severity | Issue | Suggestion |
|---|-----------|----------|-------|------------|
| 1 | SRP       | HIGH     | ...   | ...        |

Severity levels: CRITICAL / HIGH / MEDIUM / LOW
```

### Severity Guide

- **CRITICAL**: Violation causes direct bugs, data leaks, or prevents testing. Immediate action required.

- **HIGH**: Significant design flaw that will cause maintenance pain across multiple future changes. Should be addressed before merging.

- **MEDIUM**: Design smell that could be improved but is not immediately harmful. Address when convenient.

- **LOW**: Minor suggestion or style preference. Optional improvement.

### Common Violation Patterns

These are the most frequently encountered violations, listed here as a quick cross-check during active reviews:

- **Monolithic class with private helper methods** — A single class handles multiple responsibilities, using private methods to organize internally. SRP violation. Split into separate modules by responsibility.

- **Interface mirrors implementation** — The public interface exposes internal data structures or implementation-specific parameters. Information Hiding violation. Redesign the interface to describe what, not how.

- **Layer adds no abstraction** — A service layer method accepts the same parameters and returns the same shape as the repository method it calls. Different Layer Different Abstraction violation. Either merge the layers or make the upper layer provide meaningful abstraction.

- **Concrete dependency in business logic** — Business logic directly instantiates or imports a concrete infrastructure class. DIP violation. Depend on an abstraction and inject the concrete implementation.

- **Growing switch/if chains** — Adding a new variant requires modifying existing conditional branches. OCP violation. Use polymorphism, strategy pattern, or a registry.

- **Temporal decomposition** — Modules organized as "step 1, step 2, step 3" of a process, each needing knowledge of the shared data format. Information Hiding violation. Reorganize by knowledge domain so format knowledge lives in one place.

- **Fat interface** — An interface that forces consumers to depend on methods they do not use. ISP violation. Split into focused, role-specific interfaces.

- **Ambiguous naming after decomposition** — When a module is split into multiple variants (e.g., splitting a dialog into role-company and organization versions), the original module's name becomes ambiguous. Rename the original to explicitly reflect its scope (e.g., `DialogEmailSender` → `DialogEmailSenderForRoleCompany`).

- **Positional parameters obscuring intent** — A function accepts multiple positional parameters where the call site reads as an opaque list of values (e.g., `fn(domainA, domainB)`). The caller cannot tell what each argument means without checking the signature. Information Hiding violation — the interface forces callers to know parameter ordering. Use object destructuring (`fn({ apiDomain, defaultDomain })`) so each argument is self-documenting at the call site.

- **Premature decomposition** — A cohesive piece of logic is split into multiple small functions where each extracted function is shallow (interface ≈ implementation), has only one caller, and forces the reader to jump across definitions to understand a single logical flow. This combines three problems: shallow modules (no complexity is hidden), pass-through structure (intermediate functions just relay data), and information scattering (one coherent transformation is spread across multiple locations). Different Layer Different Abstraction + Information Hiding violation. Inline the logic back into the caller, or keep it extracted only when the function has multiple callers or hides non-trivial complexity.

## Design Review Checklist

All items are phrased as positive conditions — checked means the design is sound.

### Module Responsibility (SRP + Information Hiding)

- [ ] Module's purpose is describable in one sentence
- [ ] Changing one requirement affects only one module
- [ ] Design decisions (format, algorithm, protocol) are encapsulated within a single module
- [ ] Modules are organized by knowledge domain, not by execution order (no temporal decomposition)

### Interface Design (ISP + General-Purpose Modules + Information Hiding)

- [ ] Interface is the simplest form that satisfies requirements
- [ ] All methods serve multiple use cases (no single-scenario methods)
- [ ] Module is usable without understanding its internal implementation
- [ ] Interface does not expose internal data structures
- [ ] Module provides reasonable defaults

### Layers and Abstraction (Different Layer Different Abstraction + DIP)

- [ ] Adjacent layers provide different levels of abstraction
- [ ] No pass-through methods exist (methods with similar signatures that just forward calls)
- [ ] No pass-through variables exist (variables passed through layers unused by intermediate ones)
- [ ] No premature decomposition (single-caller functions that are shallow and scatter a cohesive flow)
- [ ] High-level modules depend on abstractions, not concrete low-level implementations

### Extensibility (OCP + LSP)

- [ ] New types or behaviors can be added without modifying conditional branches in existing code
- [ ] Substituting an implementation preserves the behavioral contract expected by callers

**Note on intentional deviations:** If a violation appears intentional (e.g., documented as a deliberate trade-off, a widely-used stable interface, or a pragmatic facade), note it as an observation rather than a violation. Let the user decide whether to address it.
