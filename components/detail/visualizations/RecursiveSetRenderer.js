// components/detail/visualizations/RecursiveSetRenderer.js
//
// T50 (#113) -- the `recursiveSet` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.4), covering the 4
// ExactCover/HittingSet/Partition/SetCover instances. Ported from
// Redux_GUI's StandardSetSvgReact (nested sets drawn as bracketed,
// comma-separated runs of colored elements), rebuilt as plain React-owned
// markup rather than d3 DOM manipulation against `document` (§4.1) -- there
// is nothing here d3 did that isn't already what React's own tree diffing
// does for a static, non-editable render.
//
// §3.4's "malformed at that node, not the whole tree" clause is handled
// entirely inside SetNode below: `validateRecursiveSetFrame`
// (data/visualizationTypes.js) only checks that `frame.data` itself exists,
// not that every node in the tree is internally consistent -- a node with
// `isValue: true` and no `value`, or `isValue: false` and no `list`,
// degrades to a `PlaceholderMark` at that node instead of failing the whole
// render, exactly what the contract asks for.
//
// T51 (#114): editing (add/remove/relabel a leaf, add/remove a nested
// group, toggle a group ordered/unordered) is gated behind the `editable`
// prop, exactly like T52 added for `booleanSatisfiability`. The whole tree
// is addressed by path (an array of list indices from the root) so a parent
// can remove one of its own children without that child needing to know its
// own position -- `data/instanceSerializers.js`'s
// `serializeRecursiveSetInstance` consumes the edited tree directly, with no
// location step against the original text needed at all (see that file's
// header for why this is the safest of the three wave-2 editable types).
// Every edit control here is a real, focusable, aria-labelled button or
// text input -- no drag, no right-click.

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { Fragment, useId, useState } from "react";
import { getVisualizationColor } from "../../theme";

let editIdCounter = 0;
function nextEditId(prefix) {
  editIdCounter += 1;
  return `${prefix}-${editIdCounter}`;
}

// Applies `updater` to the node reached by following `path` (a list of child indices)
// from `root`, returning a new tree with every ancestor along the way shallow-cloned.
function updateAtPath(root, path, updater) {
  if (path.length === 0) {
    return updater(root);
  }
  const [index, ...rest] = path;
  const list = root.list ?? [];
  return {
    ...root,
    list: list.map((child, i) => (i === index ? updateAtPath(child, rest, updater) : child)),
  };
}

function leafCount(node) {
  if (!node || typeof node !== "object") return 0;
  if (node.isValue) return typeof node.value === "string" ? 1 : 0;
  if (!Array.isArray(node.list)) return 0;
  return node.list.reduce((total, child) => total + leafCount(child), 0);
}

function PlaceholderMark({ id }) {
  return (
    <Box id={id} component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
      ?
    </Box>
  );
}

function Bracket({ children }) {
  return (
    <Box component="span" aria-hidden="true" sx={{ color: "text.secondary" }}>
      {children}
    </Box>
  );
}

function Comma() {
  return (
    <Box component="span" aria-hidden="true" sx={{ color: "text.secondary", mr: 0.5 }}>
      ,
    </Box>
  );
}

// Keyboard-reachable "add a leaf" affordance for one container node -- a real text field
// plus a submit button, matching T52's AddLiteralForm precedent.
function AddLeafForm({ idPrefix, onAdd }) {
  const [value, setValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, mx: 0.5 }}
    >
      <Box component="label" htmlFor={idPrefix} sx={{ display: "none" }}>
        New element value
      </Box>
      <TextField
        id={idPrefix}
        size="small"
        variant="standard"
        placeholder="value"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        sx={{ width: 60, "& input": { fontSize: "0.8125rem", py: 0.25 } }}
        inputProps={{ "aria-label": "New element value" }}
      />
      <IconButton
        id={`${idPrefix}-submit`}
        type="submit"
        size="small"
        disabled={!value.trim()}
        aria-label="Add element"
        sx={{ p: 0.375 }}
      >
        <AddIcon sx={{ fontSize: "0.875rem" }} />
      </IconButton>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.id
 * @param {Object} props.node
 * @param {number[]} [props.path] This node's position from the tree root, as a list of
 *   child indices -- `onEdit`'s updater and `onRemoveSelf` both address this node by path
 *   rather than by object identity, so a parent can drop or replace a child without that
 *   child needing to know its own position independently.
 * @param {boolean} [props.editable] T51 (#114): adds add/remove/relabel/toggle-ordered
 *   controls when true. Only ever true for the base frame (frames[0]) -- the caller owns
 *   that gate.
 * @param {(updater: (data: Object) => Object) => void} [props.onEdit] Called with a
 *   `(currentData) => nextData` updater rooted at the WHOLE tree (not just this node) --
 *   every control below composes its own local mutation with `updateAtPath(data, path,
 *   ...)` before calling this.
 * @param {() => void} [props.onRemoveSelf] Removes this node from its parent's `list`.
 *   Omitted at the tree root, which can't remove itself.
 */
function SetNode({ id, node, path = [], editable = false, onEdit, onRemoveSelf }) {
  if (!node || typeof node !== "object") {
    return <PlaceholderMark id={id} />;
  }

  if (node.isValue) {
    if (typeof node.value !== "string") {
      return <PlaceholderMark id={id} />;
    }
    if (!editable) {
      return (
        <Box
          id={id}
          component="span"
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: getVisualizationColor(node.color),
          }}
        >
          {node.value}
        </Box>
      );
    }
    return (
      <Box
        id={id}
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
      >
        <Box component="label" htmlFor={`${id}-value`} sx={{ display: "none" }}>
          Element value
        </Box>
        <TextField
          id={`${id}-value`}
          size="small"
          variant="standard"
          value={node.value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onEdit((data) =>
              updateAtPath(data, path, (target) => ({ ...target, value: nextValue })),
            );
          }}
          sx={{
            width: 64,
            "& input": {
              fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
              fontSize: "0.9375rem",
              fontWeight: 600,
              py: 0.25,
            },
          }}
          inputProps={{ "aria-label": `Rename element ${node.value}` }}
        />
        {onRemoveSelf && (
          <IconButton
            id={`${id}-remove`}
            size="small"
            aria-label={`Remove ${node.value}`}
            onClick={onRemoveSelf}
            sx={{ p: 0.375 }}
          >
            <CloseIcon sx={{ fontSize: "0.875rem" }} />
          </IconButton>
        )}
      </Box>
    );
  }

  const open = node.isOrdered ? "(" : "{";
  const close = node.isOrdered ? ")" : "}";
  const list = Array.isArray(node.list) ? node.list : [];

  function handleAddLeaf(value) {
    onEdit((data) =>
      updateAtPath(data, path, (target) => ({
        ...target,
        list: [
          ...(target.list ?? []),
          { id: nextEditId("leaf"), isValue: true, isOrdered: false, value, color: "" },
        ],
      })),
    );
  }

  function handleAddGroup() {
    onEdit((data) =>
      updateAtPath(data, path, (target) => ({
        ...target,
        list: [
          ...(target.list ?? []),
          { id: nextEditId("group"), isValue: false, isOrdered: false, list: [] },
        ],
      })),
    );
  }

  function handleToggleOrdered() {
    onEdit((data) =>
      updateAtPath(data, path, (target) => ({ ...target, isOrdered: !target.isOrdered })),
    );
  }

  if (!editable) {
    return (
      <Box
        id={id}
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap" }}
      >
        <Bracket>{open}</Bracket>
        {list.map((child, index) => (
          <Fragment key={child?.id ?? index}>
            {index > 0 && <Comma />}
            <SetNode id={`${id}-${index}`} node={child} />
          </Fragment>
        ))}
        <Bracket>{close}</Bracket>
      </Box>
    );
  }

  return (
    <Box
      id={id}
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 0.25,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 1,
        px: 0.5,
      }}
    >
      <IconButton
        id={`${id}-toggle-ordered`}
        size="small"
        aria-label={
          node.isOrdered
            ? "Make this group unordered (braces)"
            : "Make this group ordered (parentheses)"
        }
        aria-pressed={node.isOrdered}
        onClick={handleToggleOrdered}
        sx={{ p: 0.375 }}
      >
        <SwapHorizIcon sx={{ fontSize: "0.875rem" }} />
      </IconButton>
      <Bracket>{open}</Bracket>
      {list.map((child, index) => (
        <Fragment key={child?.id ?? index}>
          {index > 0 && <Comma />}
          <SetNode
            id={`${id}-${index}`}
            node={child}
            path={[...path, index]}
            editable
            onEdit={onEdit}
            onRemoveSelf={() =>
              onEdit((data) =>
                updateAtPath(data, path, (target) => ({
                  ...target,
                  list: (target.list ?? []).filter(
                    (_candidate, candidateIndex) => candidateIndex !== index,
                  ),
                })),
              )
            }
          />
        </Fragment>
      ))}
      <Bracket>{close}</Bracket>
      <AddLeafForm idPrefix={`${id}-add-leaf`} onAdd={handleAddLeaf} />
      <IconButton
        id={`${id}-add-group`}
        size="small"
        aria-label="Add nested group"
        onClick={handleAddGroup}
        sx={{ p: 0.375 }}
      >
        <AddIcon sx={{ fontSize: "0.875rem" }} />
      </IconButton>
      {onRemoveSelf && (
        <IconButton
          id={`${id}-remove`}
          size="small"
          aria-label="Remove this group"
          onClick={onRemoveSelf}
          sx={{ p: 0.375 }}
        >
          <CloseIcon sx={{ fontSize: "0.875rem" }} />
        </IconButton>
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders,
 *   so two mounted instances (Reductions' side-by-side panes) never collide
 *   (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name,
 *   folded into the accessible summary when given.
 * @param {{data: Object}} props.frame One already-validated `recursiveSet`
 *   frame.
 * @param {boolean} [props.editable] T51 (#114): true only when this frame is
 *   the base frame of a visualization the caller has decided is editable
 *   right now -- this component does not re-derive that gate.
 * @param {(updater: (data: Object) => Object) => void} [props.onDataChange]
 *   Called with a `(currentData) => nextData` updater on every structural
 *   edit. Required when `editable` is true.
 */
export default function RecursiveSetRenderer({
  idPrefix,
  instanceName,
  frame,
  editable = false,
  onDataChange,
}) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;

  const count = leafCount(frame.data);
  const summaryBody = `set structure with ${count} element${count === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  return (
    <Box
      id={scopeId}
      role="img"
      aria-label={summary}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
        p: 2,
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <SetNode id={`${scopeId}-root`} node={frame.data} editable={editable} onEdit={onDataChange} />
    </Box>
  );
}
