// hooks/useProblemDetail.js
//
// T26 (issue #35). Fetches one problem's full detail-page data from the real
// Redux backend and assembles it into the same shape data/fixtures.js's
// FixtureProblem uses, so pages/[problem].js and every components/detail/*
// section can consume it unchanged.
//
// -----------------------------------------------------------------------
// Why this can't just reuse useCatalogIndex (T23/#32)
// -----------------------------------------------------------------------
// useCatalogIndex only builds the 8-facet `tags` object every card needs.
// It deliberately does not build overview/solvers/visualizations/verifier/
// reductions -- data/fixtures.js's own header says that convenience shape
// is this task's job, not T23's. So this hook fetches the same five batch
// endpoints independently and assembles the detail-page shape from them.
//
// -----------------------------------------------------------------------
// Problem name -> problem code
// -----------------------------------------------------------------------
// The route gives this hook a problem's human-readable display name (e.g.
// "Clique"), matching how a card would link to it. But every batch endpoint
// except allInfo's own problemName field is keyed by the class/reflection
// code (e.g. "CLIQUE") -- allProblems returns codes, and allSolvers/
// allVerifiers/allVisualizations/the reduction graph are all keyed by code
// too (confirmed directly against Redux's Nav_Solvers.cs/Nav_Verifiers.cs/
// Nav_Reductions.cs: their `problemName` entry field is actually
// `problemType.Name`, the code, despite the field's name). So this hook
// resolves the given display name to its code via allInfo[code].problemName
// before it can look anything else up -- same code/name distinction
// useCatalogIndex.js's own header documents.
//
// -----------------------------------------------------------------------
// Overview's Input/Output mapping (this task's most interpretive call)
// -----------------------------------------------------------------------
// The ratified UI wants explicit `Input:`/`Output:` fields, not the formal
// set-notation definition (ARCHITECTURE.md, issue #6 conflict C3). The real
// backend has no field that is literally "Input" or "Output" -- IProblem's
// closest fields are `instanceFormat` ("a short descriptive sentence with
// an embedded concrete example" of a valid instance) and `certificateFormat`
// (the same, for a valid certificate). Both default to "" and are populated
// on only 12 of ~49 problems today (confirmed against Redux/Problems/**).
// `problemDefinition` (free-text, always populated -- it's a required
// interface member, not a defaulted one) is the fallback for Input so the
// field isn't blank for the other 37. Output has no such fallback: rather
// than fabricate a generic "True or False"-style answer that isn't true for
// every problem in the catalog, Output stays undefined (renders "Not yet
// documented"-style blank via OverviewSection) when certificateFormat is
// unset. See this task's handback summary for the alternative considered
// and rejected (a generic decision-problem answer sentence).

import { useEffect, useState } from "react";
import { mergeSupplementalTags, mergeVisualStyle } from "../data/mergeSupplementalTags";
import {
  REDUCTION_COST_MAP,
  REDUCTION_TYPE_MAP,
  SOLVER_COMPLEXITY_MAP,
  SOLVER_TYPE_MAP,
} from "../data/taxonomy";
import { buildKeyToName, findProblemKey, problemDisplayName } from "../lib/problemNames";
import {
  requestAllInfo,
  requestAllProblems,
  requestAllSolvers,
  requestAllVerifiers,
  requestAllVisualizations,
  requestAllVisualizationTypes,
  requestReductionGraph,
} from "../lib/redux";

// Detail-page-only identifier, used solely to keep element ids unique
// (VerifierSection's certificate input/button ids) -- unrelated to routing,
// which matches on the real problem name (see pages/[problem].js).
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// `className` is carried alongside the display name because live Run
// (T37/#95) needs it: ProblemProvider/solve is keyed by the solver's class
// name ("CliqueBruteForce"), which is what allSolvers lists, not by the
// human-readable solverName ("Clique Brute Force Solver") the UI shows.
//
// #229: the raw backend fields the workbench's Solver dropdown tags and info card read are
// carried too: `description` (solverDefinition), `solverTypeName` and `complexityBucketName`
// (the backend's own enum members, labelled through data/taxonomy.js's backendEnumLabel),
// and `timeComplexity` / `spaceComplexity` (see normalizeComplexity). No solver declares
// `spaceComplexity` yet, so it is null today.
function buildSolvers(solverClassNames, info) {
  return (solverClassNames ?? []).map((className) => {
    const solverInfo = info[className] ?? {};
    return {
      className,
      name: solverInfo.solverName ?? className,
      type: SOLVER_TYPE_MAP[solverInfo.solverType],
      complexityBucket: SOLVER_COMPLEXITY_MAP[solverInfo.complexityBucket],
      bigO: solverInfo.complexity || undefined,
      description: solverInfo.solverDefinition || "",
      solverTypeName: solverInfo.solverType ?? null,
      complexityBucketName: solverInfo.complexityBucket ?? null,
      timeComplexity: normalizeComplexity(solverInfo.timeComplexity),
      spaceComplexity: normalizeComplexity(solverInfo.spaceComplexity),
    };
  });
}

/**
 * #229: a solver's declared `timeComplexity` / `spaceComplexity`, as /info sends it
 * (`{Function: "2^n * |phi|", Description: ", n = number of variables, ...",
 * VariableNames: ["n", "phi"]}`), in the shape the info card reads. The Description starts
 * with ", " because the backend writes it to follow the Big-O; that is trimmed here. A bare
 * string is taken as the function itself.
 *
 * @returns {{function: string, variables: string, variableNames: string[]}|null} Null when
 *   the solver declares nothing.
 */
function normalizeComplexity(value) {
  if (typeof value === "string") {
    return value ? { function: value, variables: "", variableNames: [] } : null;
  }
  if (!value || typeof value !== "object") return null;
  const fn = value.Function ?? value.function;
  if (typeof fn !== "string" || !fn) return null;
  const description = value.Description ?? value.description;
  const variableNames = value.VariableNames ?? value.variableNames;
  return {
    function: fn,
    variables: typeof description === "string" ? description.replace(/^[\s,]+/, "") : "",
    variableNames: Array.isArray(variableNames) ? variableNames : [],
  };
}

// `className` and `backendType` are carried alongside the display name because T48
// (#111) needs both: live rendering calls `ProblemProvider/visualize?visualization=
// <className>` (keyed the same way solve/verify are, by class name rather than the
// human-readable `visualizationName`), and resolving which universal render type a
// frame is (data/visualizationTypes.js) needs the raw backend `visualizationType` wire
// value. `visualizationTypesByInstance` is `Navigation/Batch/allVisualizationTypes`'s
// answer when that endpoint exists; T40 found some deployments don't have it yet, so
// this falls back to the same field read off `allInfo`, matching what Redux_GUI's own
// hook already does for the same gap.
function buildVisualizations(visualizationClassNames, info, visualizationTypesByInstance) {
  return (visualizationClassNames ?? []).map((className) => {
    const visualizationInfo = info[className] ?? {};
    return {
      className,
      name: visualizationInfo.visualizationName ?? className,
      type: mergeVisualStyle(className, undefined),
      backendType:
        visualizationTypesByInstance[className] ?? visualizationInfo.visualizationType ?? "",
      caption: visualizationInfo.visualizationDefinition ?? "",
      // #229: what the Visualization Type info card reads. `pictureType` is what the
      // visualization draws ("Graph", "SearchTree"; null when it serves no frames). Left
      // undefined on a backend older than the field, so lib/pictureRequest.js can tell "no
      // frames picture" from "not said". `solverName` / `verifierName` are the solver whose
      // steps it plays and the verifier whose checks it draws, when it declares one.
      pictureType:
        "pictureType" in visualizationInfo ? (visualizationInfo.pictureType ?? null) : undefined,
      solverName: visualizationInfo.solver?.solverName ?? null,
      verifierName: visualizationInfo.verifier?.verifierName ?? null,
    };
  });
}

// Generic "Default Verifier" naming convention (ARCHITECTURE.md's Naming
// convention section) -- a problem can declare more than one verifier class.
//
// #279 (Workspace tweaks): `verifiers` is every verifier the problem declares,
// so Verify's verifier dropdown offers them all, and `verifier` is the first
// of them. The list is Navigation/Batch/allVerifiers' array for the problem
// (its verifier class names, which Redux finds by reflection: every class
// implementing IVerifier<TheProblem>), each described by its allInfo entry.
// allVerifiers sorts by class name, so the problem's own `defaultVerifier`
// (allInfo, the verifier's info object) is moved to the front. Every problem
// declares exactly one verifier today (Oct 2026), so the dropdown has one
// option; a second verifier added in Redux shows up here with no change.
function buildVerifiers(verifierClassNames, info, problemInfo, problemCode) {
  const verifiers = (verifierClassNames ?? []).map((className) =>
    buildOneVerifier(className, info, problemInfo, problemCode),
  );
  const fallback = problemInfo.defaultVerifier;
  const isDefault = (verifier) => {
    if (!fallback || typeof fallback !== "object") return false;
    const verifierInfo = info[verifier.className] ?? {};
    if (fallback.sourceFile && verifierInfo.sourceFile) {
      return fallback.sourceFile === verifierInfo.sourceFile;
    }
    return Boolean(fallback.verifierName) && fallback.verifierName === verifierInfo.verifierName;
  };
  const index = verifiers.findIndex(isDefault);
  if (index > 0) verifiers.unshift(...verifiers.splice(index, 1));
  return verifiers;
}

function buildVerifier(verifierClassNames, info, problemInfo, problemCode) {
  return buildVerifiers(verifierClassNames, info, problemInfo, problemCode)[0] ?? null;
}

/**
 * The one place a side's verifier list is read (#279 Workspace tweaks): a problem's
 * `verifiers` (or a reduction's `targetVerifiers`) as built above, else its single
 * `verifier` wrapped in a list (data built before the list existed), else none.
 * @param {Array|null|undefined} verifiers
 * @param {Object|null|undefined} verifier
 * @returns {Array}
 */
export function verifiersOf(verifiers, verifier) {
  if (Array.isArray(verifiers) && verifiers.length > 0) return verifiers;
  return verifier ? [verifier] : [];
}

function buildOneVerifier(verifierClassName, info, problemInfo, problemCode) {
  const verifierInfo = info[verifierClassName] ?? {};
  return {
    // Same reason as buildSolvers' className: ProblemProvider/verify is
    // keyed by the verifier class name (T37/#95).
    className: verifierClassName,
    // The verifier's own declared display name (IVerifier.verifierName,
    // e.g. "Default SAT Verifier") -- same `?? className` fallback as
    // buildSolvers/buildVisualizations use for their own name fields.
    // Distinct from this section's title, which the ratified naming
    // convention (see this file's own header) always keeps as the generic
    // "Verifier" regardless of which verifier class is shown.
    name: verifierInfo.verifierName ?? verifierClassName,
    certificateDescription: verifierInfo.verifierDefinition ?? "",
    certificateFormat: problemInfo.certificateFormat || "",
    // #279 stage 4: the problem's class name in Redux ("SAT3"), which lib/certificateHints.js
    // keys its plain descriptions by.
    problemCode: problemCode ?? null,
    exampleCertificate: verifierInfo.certificate || undefined,
    // The dropdown's tags, read the way buildSolvers reads a solver's: Redux's IVerifier
    // declares no such member today, so this is null and the option has no tags.
    complexityBucketName: verifierInfo.complexityBucket ?? null,
  };
}

// T53 (#116): `to` entries carry two things T18-era `buildReductions` never needed --
// `className` (the reduction's own class name, e.g. "KarpVertexCoverToSetCover", what
// `ProblemProvider/visualizeReduction?reduction=` takes -- confirmed directly against a
// local Redux backend) and `targetVisualization` (the reduced problem's own default
// visualization, resolved through the exact same `buildVisualizations` this file already
// uses for the current problem). The reduced pane needs a `backendType` to pick a renderer
// the same way the current problem's own visualizations do (VisualizationCanvas ->
// resolveVisualizationType), and `Navigation/Reductions` itself carries no type field for
// either side of a reduction -- VISUALIZATION_TYPE_CONTRACTS.md §5 already rejected
// resolving a universal type by inspecting a frame's own shape ("duck-typing... this
// project would rather have one static, readable map than six inline heuristics"), so this
// resolves the target's type the same static-map way, not by sniffing the fetched frame.
// `from` entries get neither: they're informational only, never selectable
// (ReductionsSection.js), so nothing ever renders a diagram for one.
//
// `to` entries also carry `name`, the reduction's own declared display name
// (IReduction.reductionName via Navigation/Reductions' edge -- ReduxISU/Redux#582),
// same convention as buildSolvers/buildVisualizations/buildVerifier's own `name`
// fields. Not currently rendered by ReductionsSection.js (which labels a reduction
// card by its target problem's name, not the reduction's own), but available to any
// caller that wants it, same as `className` already is.
function buildReductions(
  problemCode,
  reductionGraph,
  codeToName,
  visualizationsByProblem,
  info,
  visualizationTypesByInstance,
  verifiersByProblem,
  solversByProblem,
) {
  const to = [];
  const from = [];

  for (const [fromCode, toMap] of Object.entries(reductionGraph)) {
    for (const [toCode, edges] of Object.entries(toMap)) {
      for (const edge of edges) {
        if (fromCode === problemCode) {
          const targetVisualizations = buildVisualizations(
            visualizationsByProblem[toCode],
            info,
            visualizationTypesByInstance,
          );
          const [targetVisualization] = targetVisualizations;
          to.push({
            target: codeToName.get(toCode) ?? problemDisplayName(info, toCode),
            cost: REDUCTION_COST_MAP[edge.cost],
            type: REDUCTION_TYPE_MAP[edge.reductionType],
            className: edge.className,
            // The reduction's own declared display name (IReduction.reductionName, e.g.
            // "Karp Reduction: Vertex Cover to Set Cover") -- same `?? className`
            // fallback buildSolvers/buildVisualizations/buildVerifier already use for
            // their own name fields. Navigation/Reductions now sends this directly on
            // each edge (ReduxISU/Redux#582), so no separate `info` lookup is needed
            // the way solvers/visualizations/verifiers require.
            name: edge.reductionName ?? edge.className,
            targetVisualization: targetVisualization ?? null,
            // ReduxISU/Redux#912: every visualization of the target problem, the default first,
            // so the Reduction View can offer the target's other pictures.
            targetVisualizations,
            // #229: what the Using and To dropdowns' tags and info cards read. The raw enum
            // members (labelled through data/taxonomy.js's backendEnumLabel); `bigO` is the
            // reduction's own declared cost ("O(n^2), n = 3 * |SAT3.clauses| ..."), which
            // only /info carries; `description` is its reductionDefinition.
            costName: edge.cost ?? null,
            reductionTypeName: edge.reductionType ?? null,
            complexityBucketName:
              edge.complexityBucket ?? info[edge.className]?.complexityBucket ?? null,
            bigO: info[edge.className]?.complexity || "",
            description: info[edge.className]?.reductionDefinition || "",
            targetProblem: buildTargetProblem(toCode, info, codeToName),
            // #229 stage 3: Verify's "Check against: target" checks with the target
            // problem's own verifier, against the instance the reduction built.
            targetVerifier: buildVerifier(
              verifiersByProblem?.[toCode],
              info,
              info[toCode] ?? {},
              toCode,
            ),
            // #279 (Workspace tweaks): every verifier the target declares, for Verify's dropdown.
            targetVerifiers: buildVerifiers(
              verifiersByProblem?.[toCode],
              info,
              info[toCode] ?? {},
              toCode,
            ),
            // #279 stage 2: the target problem's solvers, for Execute's "Solve <target>" cell.
            targetSolvers: buildSolvers(solversByProblem?.[toCode], info),
          });
        }
        if (toCode === problemCode) {
          from.push({
            source: codeToName.get(fromCode) ?? problemDisplayName(info, fromCode),
            cost: REDUCTION_COST_MAP[edge.cost],
            type: REDUCTION_TYPE_MAP[edge.reductionType],
          });
        }
      }
    }
  }

  return { to, from };
}

/**
 * #229: the facts the To dropdown's tags and info card show about a reduction's target
 * problem: its one-line definition and its complexity class and problem type, resolved the
 * same way as this problem's own title-row tags (mergeSupplementalTags), so the two can never
 * disagree.
 */
function buildTargetProblem(problemCode, info, codeToName) {
  const problemInfo = info[problemCode] ?? {};
  const name = codeToName.get(problemCode) ?? problemDisplayName(info, problemCode);
  const tags = mergeSupplementalTags(name, { complexityClass: problemInfo.complexityClass });
  return {
    name,
    description: problemInfo.problemDefinition || "",
    complexityClass: tags.complexityClass,
    problemType: tags.problemType,
  };
}

function buildProblem(problemCode, info, batches, codeToName) {
  const problemInfo = info[problemCode] ?? {};
  const {
    solversByProblem,
    verifiersByProblem,
    visualizationsByProblem,
    reductionGraph,
    visualizationTypesByInstance,
  } = batches;

  const contributors = Array.isArray(problemInfo.contributors) ? problemInfo.contributors : [];

  // Only the badge row (pages/[problem].js's H1 complexity/problem-type
  // chips) reads `tags`, and only these two facets -- same real-value-then-
  // overlay-then-Unclassified precedence useCatalogIndex.js uses for the
  // whole catalog, called here with just this one problem's own
  // complexityClass so the detail page's badges can never disagree with the
  // card grid's for the same problem.
  const name = codeToName.get(problemCode) ?? problemDisplayName(info, problemCode);
  const tags = mergeSupplementalTags(name, {
    complexityClass: problemInfo.complexityClass,
  });

  return {
    name,
    slug: slugify(name),
    oneLiner: problemInfo.problemDefinition ?? "",
    tags,
    overview: {
      input: problemInfo.instanceFormat || problemInfo.problemDefinition || undefined,
      output: problemInfo.certificateFormat || undefined,
      source: problemInfo.source || undefined,
      contributedBy: contributors.length > 0 ? contributors.join(", ") : undefined,
      // #229: the workbench's Details panel shows the backend's own one-line Input and
      // Output descriptions ("G, a directed graph") and links the source when a link is
      // declared. `input`/`output` above keep their older fallback chain for /compare.
      inputDescription: problemInfo.inputDescription || undefined,
      outputDescription: problemInfo.outputDescription || undefined,
      sourceLink: problemInfo.sourceLink || undefined,
    },
    // T35 (#93): the instance the Solvers and Verifier sections show, and
    // the prose format describing it, both straight off allInfo. Kept as
    // their own top-level fields rather than folded into `overview`: the
    // Overview mapping has its own instanceFormat-then-problemDefinition
    // fallback chain for a different purpose (see this file's header), and
    // the Solvers format block needs to be able to change without
    // disturbing it. `defaultInstance` is a required IProblem member and
    // all 50 problems supply one (verified against the live API
    // 2026-09-02), but a missing one is still normalized to "" here rather
    // than assumed away, so the input below it is always a string.
    defaultInstance: problemInfo.defaultInstance || "",
    instanceFormat: problemInfo.instanceFormat || "",
    solvers: buildSolvers(solversByProblem[problemCode], info),
    visualizations: buildVisualizations(
      visualizationsByProblem[problemCode],
      info,
      visualizationTypesByInstance,
    ),
    verifier: buildVerifier(verifiersByProblem[problemCode], info, problemInfo, problemCode),
    // #279 (Workspace tweaks): every verifier the problem declares, `verifier` first.
    verifiers: buildVerifiers(verifiersByProblem[problemCode], info, problemInfo, problemCode),
    reductions: buildReductions(
      problemCode,
      reductionGraph,
      codeToName,
      visualizationsByProblem,
      info,
      visualizationTypesByInstance,
      verifiersByProblem,
      solversByProblem,
    ),
  };
}

/**
 * Fetches and assembles one problem's full detail-page data -- see file
 * header for the shape contract (matches data/fixtures.js's FixtureProblem)
 * and the name/code resolution and Overview-mapping notes.
 *
 * No backend reachable, or `problemName` matches no real problem -> `error`
 * is set or `problem` stays null, never a crash (#5) -- pages/[problem].js
 * renders its existing "not found" state either way.
 *
 * @param {string} url Base API URL, e.g. `/api/redux/`.
 * @param {string|null} problemName Exact real problem display name (e.g.
 *   "Clique") or its key ("CLIQUE", any case; #279), or null/undefined while the route
 *   param isn't known yet. `problem.name` is always the display name.
 * @returns {{problem: Object|null, loading: boolean, error: Error|null}}
 */
export function useProblemDetail(url, problemName) {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!problemName) {
        if (!cancelled) {
          setProblem(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [
          problemCodes,
          info,
          solversByProblem,
          verifiersByProblem,
          visualizationsByProblem,
          reductionGraph,
          visualizationTypesByInstance,
        ] = await Promise.all([
          requestAllProblems(url),
          requestAllInfo(url),
          requestAllSolvers(url),
          requestAllVerifiers(url),
          requestAllVisualizations(url),
          requestReductionGraph(url),
          // Falls back to allInfo per-instance (buildVisualizations) rather than
          // failing the whole page load -- T40 found some deployments don't have this
          // endpoint yet, which is exactly the case requestAllVisualizationTypes's own
          // doc comment says a caller needs to handle.
          requestAllVisualizationTypes(url).catch(() => null),
        ]);

        if (cancelled) return;

        const safeInfo = info ?? {};
        const codeToName = buildKeyToName(problemCodes, safeInfo);

        // #279: a route names the problem by display name; its key ("VERTEXCOVER") finds it too.
        const problemCode = findProblemKey(codeToName, problemName);

        if (!problemCode) {
          setProblem(null);
          return;
        }

        setProblem(
          buildProblem(
            problemCode,
            safeInfo,
            {
              solversByProblem: solversByProblem ?? {},
              verifiersByProblem: verifiersByProblem ?? {},
              visualizationsByProblem: visualizationsByProblem ?? {},
              reductionGraph: reductionGraph ?? {},
              visualizationTypesByInstance: visualizationTypesByInstance ?? {},
            },
            codeToName,
          ),
        );
      } catch (caughtError) {
        if (!cancelled) setError(caughtError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, problemName]);

  return { problem, loading, error };
}
