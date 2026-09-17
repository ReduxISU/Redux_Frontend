// components/PlaylistCreator.js
//
// #165 -- the "Create a playlist" form on pages/playlists/index.js: a title, an
// optional description, and up to MAX_CUSTOM_PLAYLIST_PROBLEMS ordered problems
// (each with an optional per-step note), picked from the real catalog the same
// way components/ReductionReachabilityFilter.js's own source picker already
// does (a plain, non-freeSolo Autocomplete over every real problem name) --
// picking from the list rather than typing a name freehand means a playlist
// built through this form can never carry a typo'd/unknown problem name the
// way a hand-edited data/playlists.js entry theoretically could.
//
// Each step can also optionally name a declared solver and/or visualization to
// preselect on that step's problem page (the same values components/detail/
// SolversSection.js's/VisualizationsSection.js's own `?solver=`/`?viz=` permalink
// params already read). Those two pickers are scoped to whichever problem the
// step currently names -- PlaylistCreatorStep below fetches that one problem's
// own detail (useProblemDetail) to list its real declared solvers/
// visualizations, same non-freeSolo picker pattern as the problem field itself,
// so these two can't carry a typo'd name either.
//
// This component only gathers and validates input; it holds no opinion about
// what happens to a finished playlist. On submit it calls `onCreate` with the
// plain `{title, description, problems}` shape lib/playlistQuery.js's
// buildCustomPlaylistQueryValue expects -- encoding the result into a link,
// recording it in "My playlists" and navigating there are all the caller's
// job (pages/playlists/index.js), same division of labor as
// ReductionReachabilityFilter being a controlled picker with no traversal
// logic of its own.

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useProblemDetail } from "../hooks/useProblemDetail";
import {
  MAX_CUSTOM_PLAYLIST_PROBLEMS,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_TITLE_LENGTH,
} from "../lib/playlistQuery";
import { REDUX_API_BASE_URL } from "../lib/redux";
import { thinScrollbarSx } from "./theme";

function emptyStep() {
  return { name: null, note: "", solver: null, visualization: null };
}

/**
 * One step's own row: the problem picker plus the note/solver/visualization
 * fields scoped to whichever problem is currently picked. A separate
 * component (rather than inlined in the `.map` below) so it can call
 * useProblemDetail for just this one step's problem -- a variable number of
 * step rows is fine for the rules of hooks as long as each row is its own
 * component instance, which `.map` already gives it.
 */
function PlaylistCreatorStep({
  index,
  step,
  onChange,
  onRemove,
  canRemove,
  problemNames,
  loading,
}) {
  const { problem, loading: detailLoading } = useProblemDetail(REDUX_API_BASE_URL, step.name);
  const solverNames = (problem?.solvers ?? []).map((solver) => solver.name);
  const visualizationNames = (problem?.visualizations ?? []).map(
    (visualization) => visualization.name,
  );

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Typography
        variant="body1"
        sx={{ color: "text.secondary", fontWeight: 600, minWidth: "1.5rem", mt: 1 }}
      >
        {index + 1}.
      </Typography>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Autocomplete
          id={`playlist-creator-problem-${index}`}
          options={problemNames}
          value={step.name}
          // Clears any solver/visualization already picked -- a name scoped
          // to the previous problem is meaningless (and likely wrong) for
          // whatever this step now points at.
          onChange={(_event, next) => onChange({ name: next, solver: null, visualization: null })}
          disabled={loading}
          size="small"
          slotProps={{ listbox: { sx: thinScrollbarSx } }}
          renderInput={(params) => (
            <TextField {...params} label="Problem" placeholder="Pick a problem" required />
          )}
        />
        <TextField
          id={`playlist-creator-note-${index}`}
          label="Note (optional)"
          value={step.note}
          onChange={(event) => onChange({ note: event.target.value })}
          slotProps={{ htmlInput: { maxLength: MAX_NOTE_LENGTH } }}
          size="small"
          fullWidth
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Autocomplete
            id={`playlist-creator-solver-${index}`}
            options={solverNames}
            value={step.solver}
            onChange={(_event, next) => onChange({ solver: next })}
            disabled={!step.name || detailLoading || solverNames.length === 0}
            size="small"
            sx={{ flex: 1 }}
            slotProps={{ listbox: { sx: thinScrollbarSx } }}
            renderInput={(params) => <TextField {...params} label="Solver to show (optional)" />}
          />
          <Autocomplete
            id={`playlist-creator-visualization-${index}`}
            options={visualizationNames}
            value={step.visualization}
            onChange={(_event, next) => onChange({ visualization: next })}
            disabled={!step.name || detailLoading || visualizationNames.length === 0}
            size="small"
            sx={{ flex: 1 }}
            slotProps={{ listbox: { sx: thinScrollbarSx } }}
            renderInput={(params) => (
              <TextField {...params} label="Visualization to show (optional)" />
            )}
          />
        </Box>
      </Box>
      <IconButton
        id={`playlist-creator-remove-${index}`}
        aria-label={`Remove step ${index + 1}`}
        size="small"
        onClick={onRemove}
        disabled={!canRemove}
        sx={{ mt: 0.5 }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string[]} props.problemNames Every real problem name currently in
 *   the catalog index, used as each step's problem picker options.
 * @param {boolean} [props.loading] Disables the problem pickers while the
 *   catalog is still loading -- there's nothing real to pick yet.
 * @param {(playlist: {title: string, description: string, problems: {name: string, note?: string, solver?: string, visualization?: string}[]}) => void} props.onCreate
 */
export default function PlaylistCreator({ problemNames, loading = false, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([emptyStep()]);

  const validSteps = steps.filter((step) => step.name);
  const canSubmit = title.trim().length > 0 && validSteps.length > 0;

  const updateStep = (index, patch) => {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const addStep = () => {
    setSteps((current) =>
      current.length < MAX_CUSTOM_PLAYLIST_PROBLEMS ? [...current, emptyStep()] : current,
    );
  };

  const removeStep = (index) => {
    setSteps((current) => current.filter((_step, i) => i !== index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    onCreate({
      title: title.trim(),
      description: description.trim(),
      problems: validSteps.map((step) => {
        const entry = { name: step.name };
        const note = step.note.trim();
        if (note) entry.note = note;
        if (step.solver) entry.solver = step.solver;
        if (step.visualization) entry.visualization = step.visualization;
        return entry;
      }),
    });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="h2" component="h2" sx={{ fontSize: "1.125rem" }}>
        Create a playlist
      </Typography>

      <TextField
        id="playlist-creator-title"
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        slotProps={{ htmlInput: { maxLength: MAX_TITLE_LENGTH } }}
        required
        size="small"
        fullWidth
      />

      <TextField
        id="playlist-creator-description"
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION_LENGTH } }}
        multiline
        minRows={2}
        size="small"
        fullWidth
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map((step, index) => (
          <PlaylistCreatorStep
            // biome-ignore lint/suspicious/noArrayIndexKey: steps have no other stable identity while being authored -- a step can be added, removed or repoint to a different problem, but its position is otherwise all there is.
            key={index}
            index={index}
            step={step}
            onChange={(patch) => updateStep(index, patch)}
            onRemove={() => removeStep(index)}
            canRemove={steps.length > 1}
            problemNames={problemNames}
            loading={loading}
          />
        ))}

        <Button
          id="playlist-creator-add-problem"
          startIcon={<AddIcon />}
          onClick={addStep}
          disabled={loading || steps.length >= MAX_CUSTOM_PLAYLIST_PROBLEMS}
          sx={{ alignSelf: "flex-start" }}
        >
          Add a problem
        </Button>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Up to {MAX_CUSTOM_PLAYLIST_PROBLEMS} problems, to keep the resulting link a reasonable
          length.
        </Typography>
      </Box>

      <Button
        id="playlist-creator-submit"
        type="submit"
        variant="contained"
        disabled={!canSubmit}
        sx={{ alignSelf: "flex-start" }}
      >
        Create playlist
      </Button>
    </Box>
  );
}
