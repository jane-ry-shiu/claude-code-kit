# Deep Module Design — Detailed Reference

**Based on "A Philosophy of Software Design" by John Ousterhout, Chapters 5-7.**

This reference is used during active design reviews to evaluate whether modules
are deep (simple interface, rich functionality) or shallow (complex interface,
little functionality). The three chapters together build a coherent argument:
modules should hide complexity behind simple, general interfaces where each
layer of a system provides a genuinely different abstraction.

---

## Chapter 5: Information Hiding

### Core Concepts

1. **Encapsulate design decisions.** Each module should embed specific design
   decisions — data formats, algorithm choices, protocol details, storage
   representations — in its implementation, without exposing them through its
   interface. The interface describes *what* the module does; the implementation
   decides *how*.

2. **Dual benefit.** Information hiding simplifies the interface, reducing the
   cognitive load on consumers. It also provides change isolation: when a hidden
   decision is revised (e.g., switching from JSON to Protocol Buffers
   internally), only the owning module needs modification. No ripple effects
   propagate to callers.

3. **Applies at every scope.** Information hiding is not limited to public API
   boundaries. Within a module's internals, the same principle applies: limit
   variable visibility to the narrowest possible scope, reduce the number of
   places any piece of state is read or written, and avoid sharing mutable
   structures across internal helper functions unnecessarily.

### Violation Symptoms — Information Leakage

1. **Shared knowledge across modules.** Multiple modules contain awareness of
   the same design decision. For example, if three modules all know the byte
   layout of a custom file format, a change to that format forces coordinated
   changes across all three. The knowledge should live in exactly one place.

2. **Exposed internal data structures.** The interface returns references to
   internal collections, mutable state objects, or implementation-specific
   types. Callers become coupled to the internal representation, and changes to
   it break consumers even if the logical behavior is unchanged.

3. **Temporal decomposition.** Modules are split along the axis of *when*
   operations happen rather than *what knowledge* they encapsulate. A classic
   example: separating "read raw data" from "parse data" into two modules,
   even though both must understand the same format. The execution order
   (read, then parse) drives the decomposition, scattering format knowledge
   across module boundaries. This is one of the most common and insidious
   forms of information leakage.

4. **Implicit usage contracts.** Users must understand module internals to use
   it correctly — for instance, calling methods in a mandatory sequence,
   knowing that a cache must be warmed before queries work, or understanding
   that a returned object shares mutable state with the module. If correct
   usage depends on knowledge of the implementation, information is leaking
   through the interface even if it is not syntactically visible.

### Correct Direction

1. **Organize around knowledge, not execution order.** Group functionality by
   the design decisions it embodies. All code that knows about a particular
   data format, protocol, or algorithm should live together in one module,
   regardless of when those operations execute in the overall flow.

2. **Merge or encapsulate shared knowledge.** When two modules share awareness
   of the same decision, either merge them into one module or extract the
   shared knowledge into a new module that hides it behind a simple interface.
   The goal is exactly one owner per design decision.

3. **Default to doing the right thing.** Interfaces should provide sensible
   defaults so that common use cases require minimal configuration. A module
   that works correctly out of the box with no special setup hides more
   information than one requiring callers to supply detailed parameters.

4. **Do not over-hide.** Information hiding minimizes what callers *must* know,
   but it does not mean hiding information that callers genuinely need to make
   correct decisions. If a caller must understand a constraint (e.g., maximum
   input size, thread-safety guarantees), that belongs in the interface
   contract. The goal is to minimize required external knowledge, not to
   eliminate it entirely.

---

## Chapter 6: General-Purpose Modules Are Deeper

### Core Concepts

1. **"Somewhat general" strategy.** The implementation satisfies current,
   concrete needs — no speculative functionality is built. However, the
   *interface* is designed generically enough that it could serve multiple use
   cases without modification. This balances pragmatism (build only what is
   needed) with longevity (the interface does not encode a single caller's
   assumptions).

2. **Generic interfaces yield deeper modules.** A general interface tends to
   have fewer methods, each more powerful, producing a simpler surface area
   that hides more functionality. This reduces cognitive load: callers learn
   fewer concepts and combine them to achieve diverse goals.

3. **Three evaluation questions.** When assessing whether an interface is
   sufficiently general, ask:
   - What is the simplest interface that satisfies all current needs?
   - How many distinct scenarios could each method serve?
   - Is this API easy to use for the common cases?

   If a method can only answer "one" to the second question, it is likely too
   specialized.

### Violation Symptoms

1. **Single-use-case methods.** The module's interface contains methods designed
   for one specific caller scenario rather than expressing the module's general
   capabilities. For example, a text-editing module that exposes `backspace()`
   and `deleteSelection()` is encoding UI-level operations. These are the
   caller's concepts, not the text module's concepts.

2. **Near-duplicate methods.** Multiple methods perform almost the same
   operation with minor variations (different parameters, slightly different
   behavior). This indicates that a single, more general method could replace
   them, with the variations expressed through parameters or composition.

3. **Implementation details in the API.** The interface forces callers to be
   aware of how the module works internally — for example, requiring callers
   to manage internal indices, pass implementation-specific flags, or call
   setup/teardown methods that reflect internal lifecycle rather than logical
   operations.

4. **Interface grows with each consumer.** Every new use case requires adding
   new methods to the module. The module is acting as a collection of
   caller-specific helpers rather than providing a stable set of general
   capabilities. The interface surface area scales linearly with the number
   of consumers.

### Correct Direction

1. **Fewer, more powerful methods.** Replace many specialized methods with a
   small number of general methods that can be composed to achieve the same
   results. For example, two methods — `insert(position, text)` and
   `delete(start, end)` — can replace a dozen specialized editing operations.
   Each general method does more work per call, making the module deeper.

2. **Reflect capabilities, not caller scenarios.** The interface should describe
   what the module *can do*, not what a specific caller *wants to do*. Callers
   map their high-level intentions onto the module's general operations. This
   keeps the module's interface stable even as new callers with new scenarios
   arrive.

3. **General does not mean over-engineered.** "Somewhat general" is not an
   invitation to build speculative features. Do not implement functionality
   that no current use case requires. The key distinction: the *interface*
   should be general (capable of supporting future scenarios without change),
   while the *implementation* should be minimal (satisfying only current
   needs). Generality lives in the interface design, not in extra code.

---

## Chapter 7: Different Layer, Different Abstraction

### Core Concepts

1. **Adjacent layers should differ in abstraction level.** In a well-designed
   system, each layer provides a distinctly different way of thinking about the
   problem. A networking stack, for example, progresses from raw bytes to
   frames to packets to streams to application messages — each layer offers a
   fundamentally different abstraction.

2. **Similar abstractions signal decomposition problems.** When two adjacent
   layers expose similar interfaces or operate at the same level of detail, it
   suggests the boundary between them is not earning its cost. The layering
   adds complexity (more interfaces to understand, more indirection to trace)
   without adding value (no new abstraction, no hidden complexity).

3. **Each layer must provide net value.** Introducing a layer is only justified
   if it eliminates more complexity elsewhere than it introduces through its
   own interface and the coupling it creates. A layer that merely relays
   information or trivially transforms it fails this test.

### Violation Symptoms — Pass-Through Methods

1. **Thin delegation with matching signatures.** A method does little beyond
   calling another method in an adjacent layer, and its signature closely
   mirrors the method it calls. The upper method adds no abstraction, no
   error handling, no aggregation — it simply forwards the call.

2. **Shallow modules.** Pass-through methods are a hallmark of shallow modules:
   the interface is no simpler than the implementation, so the module provides
   no complexity reduction. Callers gain nothing from the layer's existence
   that they could not get by calling the lower layer directly.

3. **Unnecessary coupling between layers.** Because the pass-through method
   mirrors the lower layer's signature, any change to the lower layer's
   interface forces a corresponding change to the upper layer. The layers are
   not independent; they are mechanically coupled with no abstraction buffer
   between them.

### Violation Symptoms — Excessive Decorators

1. **Many shallow wrappers.** A proliferation of small wrapper classes, each
   adding only a thin slice of functionality (logging, caching, validation),
   stacked on top of each other. Each wrapper is individually trivial but
   collectively they create deep call chains that are difficult to navigate
   and reason about.

2. **Cross-layer API duplication.** The wrapper's interface is a near-copy of
   the wrapped class's interface. The decorator adds one small behavior but
   must replicate every method signature from the base. This is a maintenance
   burden and a sign that the abstraction level has not actually changed.

### Violation Symptoms — Pass-Through Variables

1. **Long parameter chains.** A variable is passed through a sequence of
   methods where most intermediate methods have no use for it. They accept
   the variable solely to relay it to the next method in the chain. The
   variable travels through layers that have no logical relationship to it.

2. **Signature pollution.** Adding a new cross-cutting concern (e.g., a
   request ID, a configuration flag) requires modifying the signatures of
   every method in the chain, even those that never inspect the value. This
   creates widespread, mechanical changes that obscure the actual design
   intent.

### Correct Direction

1. **Pass-through methods: restructure the layers.** Several strategies apply:
   - Expose the lower layer directly to the caller, removing the pass-through
     layer entirely.
   - Redistribute responsibilities so that each layer does meaningful work
     that justifies its existence.
   - Merge the two layers if they operate at the same abstraction level and
     separating them provides no benefit.

   The right choice depends on whether the layer has a legitimate role that
   simply needs more responsibility, or whether it is fundamentally redundant.

2. **Decorators: consolidate functionality.** If the added behavior is
   universally useful, incorporate it directly into the base class rather than
   wrapping it. If multiple decorators are commonly applied together, merge
   them into a single richer class. Reserve the decorator pattern for cases
   where the combinations are genuinely dynamic and varied.

3. **Pass-through variables: use a Context Object.** Bundle cross-cutting state
   (configuration, request context, credentials, tracing identifiers) into a
   single context object that is passed through the chain. Intermediate methods
   forward the context without needing to know its contents. Adding new
   cross-cutting data requires changing only the context definition and the
   endpoints that produce or consume the data — not every method in between.

4. **Ensure interface and implementation differ.** The external abstraction
   presented by a module's interface should be at a different level of detail
   than its internal representation. If the interface is essentially a mirror
   of the implementation, the module is not doing its job of hiding complexity.
   A well-designed interface lets callers think in higher-level terms while the
   implementation handles lower-level details.

---

## Premature Decomposition

### Core Concept

Decomposition is valuable when it hides complexity — when the extracted unit
has a simple interface relative to its implementation, and callers benefit from
not knowing the internals. But decomposition applied prematurely — before there
is evidence of reuse or hidden complexity — produces the opposite effect: it
scatters a cohesive logical flow across multiple shallow functions, forcing
readers to jump between definitions to reconstruct what was originally a single
readable sequence.

Premature decomposition is the intersection of three existing concepts:

- **Shallow module** — the extracted function's interface is roughly as complex
  as its body. No complexity is hidden; the caller gains nothing from the
  indirection.
- **Pass-through method** — the extracted function mostly relays its arguments
  to the next level with minimal transformation. It adds a layer without
  adding abstraction.
- **Information scattering** — a single coherent transformation or algorithm
  is spread across multiple function definitions. Understanding the whole
  requires reading all the pieces and mentally reassembling them.

### When to Extract a Function

| Condition | Action |
|-----------|--------|
| Multiple callers exist or are concretely anticipated | Extract — reuse justifies the indirection |
| Function hides non-trivial complexity (>10 lines of logic with branching, error handling, or algorithm) | Extract — the interface is simpler than the implementation |
| Function provides a different level of abstraction than its caller | Extract — the layer earns its cost |
| Single caller + function body is short and straightforward | Inline — extraction adds indirection without reducing complexity |
| Reader must jump to the extracted function to understand the caller's flow | Inline — the scattering harms readability more than the extraction helps |

### Key Distinction from "Long Function" Advice

Conventional wisdom says "extract small functions." This is correct when each
extracted function is deep — hiding meaningful complexity behind a simple name.
It is harmful when applied mechanically to produce many shallow functions that
each do trivially little. The goal is not short functions; the goal is deep
modules. A 30-line function that reads top-to-bottom as a coherent flow is
better than three 10-line functions where the reader must jump between files
to understand the same logic.

---

## Key Insight

The unifying thread across Chapters 5, 6, and 7 is a single design objective:
**deep modules with simple interfaces that hide complexity.**

- Chapter 5 explains *what* to hide: design decisions, internal state,
  implementation details.
- Chapter 6 explains *how* to shape the interface: make it general enough to
  serve multiple scenarios with few, powerful methods.
- Chapter 7 explains *how to layer* modules: each layer must provide a
  different abstraction, and pass-through behavior is a signal that a layer
  is not pulling its weight.

A module is deep when its interface is small relative to the functionality it
provides. Every design decision in these three chapters — hiding information,
generalizing interfaces, differentiating abstractions across layers — serves
this goal. During design review, the central question is always: does this
module make the system simpler for the code that depends on it, or does it
merely redistribute complexity without reducing it?
