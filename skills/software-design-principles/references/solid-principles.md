# SOLID Principles — Detailed Reference

This reference is consulted during active design reviews to evaluate whether
code under review adheres to the five SOLID principles. Each section defines
the principle, lists observable violation symptoms, and describes the correct
direction for remediation.

---

## SRP — Single Responsibility Principle

**Definition:** A module should have only one reason to change — it serves only
one actor.

"Reason to change" means one stakeholder or business concern. When two
independent concerns share a module, a change requested by one actor risks
breaking the other. SRP is not about doing "one thing" at a mechanical level;
it is about aligning module boundaries with the actors and requirements that
drive change.

**Violation symptoms:**

- A file or class handles multiple unrelated business domains. For example, a
  single module calculates pricing, sends email notifications, and formats PDF
  reports — three concerns driven by different stakeholders.
- Modifying requirement A forces touching requirement B's code. The two
  concerns are entangled in shared state or interleaved control flow, so you
  cannot change one without risking the other.
- Hard to name the module precisely. If the most natural name contains vague
  words like "And", "Manager", "Handler", or "Utils", the module likely
  aggregates unrelated responsibilities that each deserve their own name.
- Function parameters include boolean flags that switch between two entirely
  different operations. A flag-driven branch is a sign that two distinct
  responsibilities have been forced into a single entry point rather than
  separated into independent modules with clear intent.

**Correct direction:**

Split by reason for change. Each resulting module should be describable in one
sentence without conjunctions. Extract independent responsibility modules so
that a requirement change from one actor touches exactly one module.

A common misconception is that using private helper methods to organize multiple
responsibilities internally satisfies SRP. It does not. If two helpers serve
different actors and change for different reasons, they belong in separate
modules — not separate methods within the same module. The test is not "is the
code tidy?" but "how many independent reasons could force this module to
change?"

When reviewing, ask: "If I describe what this module does, do I need the word
'and'?" If yes, there is likely a split waiting to happen.

---

## OCP — Open-Closed Principle

**Definition:** Open for extension, closed for modification — adding new
behavior should not require altering existing, tested code.

**Violation symptoms:**

- Every new type or variant requires modifying an existing if/else chain or
  switch statement. The core module accumulates cases over time and becomes a
  magnet for merge conflicts.
- Adding a feature requires editing a core module that many other modules depend
  on, increasing the blast radius of the change and forcing re-testing of
  unrelated paths.

**Correct direction:**

Use strategy pattern, lookup maps, plugin mechanisms, or polymorphic dispatch
to replace conditional branches. New behavior is added by registering a new
strategy or implementation rather than editing the module that selects among
them. The goal is that the existing module's source file does not need to be
opened at all when a new variant arrives.

---

## LSP — Liskov Substitution Principle

**Definition:** Subtypes or implementations should seamlessly substitute their
base type or interface without breaking caller expectations.

**Violation symptoms:**

- A subclass override throws exceptions that callers of the parent type do not
  expect and are not documented in the parent contract. Callers written against
  the base type break at runtime.
- A subclass ignores or empty-implements a parent method (no-op override),
  silently violating the behavioral contract that callers rely on.
- Consumer code checks the concrete type before calling methods. The presence
  of type checks or instanceof guards indicates that substitutability has
  broken down.

**Correct direction:**

Honor the full behavioral contract of the interface or base type. Preconditions
may be equal or weaker; postconditions may be equal or stronger. If a subclass
cannot fully satisfy the parent's behavior, the inheritance hierarchy needs
redesign — either narrow the base contract or introduce a separate interface
that honestly represents the subclass's capabilities.

---

## ISP — Interface Segregation Principle

**Definition:** Users should not be forced to depend on interfaces they do not
use.

A wide interface couples consumers to methods they never call, increasing the
surface area for breaking changes and making the system harder to understand,
test, and evolve.

**Violation symptoms:**

- A consumer uses only 20% of a module's functionality but must understand,
  import, and potentially mock the entire API to work with it. Cognitive load
  and coupling are disproportionate to actual need.
- A module exports many methods, but most consumers only call a small subset.
  The module has become a grab-bag serving several distinct audiences through
  one interface.
- A configuration object contains dozens of fields, but most usage scenarios
  need only a few. Consumers must navigate irrelevant options and risk
  misconfiguring fields that do not apply to their case.

**Correct direction:**

Split wide interfaces into multiple focused, narrow interfaces — one per
consumer role or usage scenario. Provide different entry points so each consumer
depends only on the slice it actually needs. When reviewing a module's export
surface, ask: "What does each consumer actually need?" and ensure that subset is
available without dragging in unrelated concerns.

In practice, this means preferring several small, role-specific interfaces over
one large general-purpose interface. A module can still implement all of them
internally, but consumers see only the facet relevant to their work.

---

## DIP — Dependency Inversion Principle

**Definition:** High-level modules should not depend on low-level modules; both
should depend on abstractions.

The direction of source-code dependency should point toward policy (business
rules), not toward detail (infrastructure). When high-level logic directly
imports concrete infrastructure, the architecture is fragile: any change in
infrastructure ripples into business logic.

**Violation symptoms:**

- Business logic directly imports a concrete infrastructure implementation —
  an HTTP client, a specific storage driver, a third-party SDK. The high-level
  module's source file contains import paths pointing at low-level detail.
- Replacing or upgrading the underlying implementation requires modifying
  high-level modules, even though the business rules have not changed. The
  coupling forces coordinated changes across architectural layers.
- Dependencies cannot be easily substituted during testing. Unit tests for
  business logic require spinning up real infrastructure or complex mocking of
  concrete classes, rather than injecting a simple test double that satisfies
  an abstract interface.

**Correct direction:**

High-level modules define the abstract interface they need. Low-level modules
implement that interface. Dependencies are injected through constructor
parameters, function arguments, or a composition root — never resolved by the
high-level module reaching out to import a concrete implementation.

In frontend codebases, this often means accepting service instances as
constructor or function parameters rather than importing them at the top of the
file. The business logic declares what capabilities it requires (e.g., "a
function that fetches user data"); the wiring layer decides which concrete
implementation satisfies that requirement.

The result is that high-level modules are insulated from infrastructure churn,
and tests can substitute lightweight doubles without touching production wiring.

---

## Cross-Cutting Observations

**SRP and ISP address scope from different angles.** SRP looks inward at the
module's implementation: does it serve more than one actor? ISP looks outward at
the module's interface: does it force consumers to depend on more than they
need? A module can satisfy SRP (one reason to change) yet violate ISP (its
interface is wider than any single consumer requires). Reviewing both together
catches a broader class of design issues.

**OCP depends on DIP.** Extending behavior without modifying existing code
typically requires that the extension point is defined as an abstraction. If
the core module is tightly coupled to concrete implementations, there is no
seam where new behavior can be plugged in. Applying DIP first often makes OCP
achievable naturally.

**LSP is the contract enforcement layer.** SRP, OCP, ISP, and DIP establish
structural boundaries and abstractions. LSP ensures those abstractions are
honest — that every implementation truly honors the contract its interface
advertises. Without LSP, the other principles create an architecture of
promises that implementations silently break.

**Practical ordering for review.** When reviewing a design, start with SRP
(are responsibilities properly separated?), then ISP (are interfaces narrow
enough?), then DIP (are dependencies pointing the right way?), then OCP (can
we extend without modifying?), and finally LSP (do implementations honor their
contracts?). This progression moves from structural clarity to behavioral
correctness.
