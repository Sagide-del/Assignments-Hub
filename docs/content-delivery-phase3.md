# Phase 3: exact-answer verification and mathematical grading

## Runtime

`services/math-engine` is a private FastAPI service with `/solve` and `/equivalent`. It uses SymPy for bounded exact algebra, numeric square matrices (1–4 rows/columns), and atom-conservation balancing. `requirements.txt` is the lightweight default. `balance-rxns` is listed separately in `requirements-optional-chemistry.txt`: its pymatgen/numpy/scipy dependency stack is unnecessary for these conservation calculations and is deliberately not installed on the constrained production host.

`npm run build` copies the Python source into the backend deployment and prepares `backend/.math-venv`. Python 3 with venv support is required at build/runtime. The NestJS client starts Uvicorn lazily on a private ephemeral loopback port with an automatically generated authentication token; no additional paid service or manual secret is required. Alternatively configure MATH_ENGINE_URL and MATH_ENGINE_TOKEN for an independently hosted trusted instance. MATH_ENGINE_PYTHON can override the interpreter.

Requests use a bounded queue and one calculation worker at a time. The Python worker uses forkserver, a three-second deadline, CPU/address-space limits, and an explicit AST allowlist rather than eval or string sympification. JavaScript, attributes, arbitrary Python calls, imports and unbounded powers are not accepted. No public solver endpoint is exposed by NestJS. The public version probe runs fixed algebra/chemistry self-checks and never reveals answers to student questions.

## Supported scope

Supported algebra is exact expression simplification and single-variable polynomial equations with one real solution. Matrix syntax is det([[...]]) or inverse([[...]]); a bare square matrix requests its determinant. Chemical syntax uses neutral formulae and `->`, including bounded parenthesised groups; ionic charge, state notation and underdetermined reactions are unsupported. This is not a general natural-language solver.

## Generation and review

For suitable Mathematics/Chemistry calculations, the CMS prompt asks for an optional canonical math_problem whose expression must appear verbatim in the question text. This metadata is extracted before the existing strict question/illustration validator runs. AI-provided verified_answer fields remain disallowed. Supported calculations receive server-generated verified_answer and math_verification metadata, including solution steps. MISMATCH means the solver disagrees with the AI's selected option and blocks publication. UNSUPPORTED never claims verification. Outages abort generation before storing a new draft; they are not silently converted to verification success.

Enrichment verifies additional questions while preserving original snapshots. Existing questions are not regenerated or silently rewritten. No additional AI request is made for verification.

## Grading

Only the trusted metadata in the stored CMS module is used. The materialised question's order, text and original answer must match that source. The assessment workspace does not receive verified answers. On final submission, these verified questions use `/equivalent`; e.g. `4`, `x=4` and `8/2` match `x = 4`. Chemical coefficients are compared as normalized stoichiometric ratios, and matrices by exact entries. A solver outage returns a retryable error before a final submission write; existing draft answers are retained. Autosave does not call the solver. Nonverified legacy questions keep their existing grading behaviour.

No database migration is needed. M-Pesa, Teacher RBAC, SBA, CSL and illustration code are unchanged. CI runs Python tests, real NestJS/Python integration tests and the existing regression suites, then waits for the live engine self-check before publishing the frontend.
