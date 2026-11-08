// components/workbench/ChainPictures.js
//
// The row under a chain's route that picks the picture each of its problems is drawn with
// (ProblemProvider/reductionChainPictures lists them). One dropdown per problem with more than
// one picture the chain can draw it with, labelled with the problem's name and naming each
// picture by its type ("Set Cover: Bipartite Graph"). A problem's picture draws both steps it is
// part of: the one that builds it and the one that starts from it. Under the row, the request
// that draws the chain again: its spinner and Cancel while it runs, and why it failed when it
// did (the dropdown is then back on the picture still drawn).

import Box from "@mui/material/Box";
import ComputeStatus from "../detail/ComputeStatus";
import TaggedSelect from "./TaggedSelect";

/**
 * @param {Object} props
 * @param {string} props.idPrefix
 * @param {Array<{position: number, problem: string, value: string, options: Array<{value:
 *   string, label: string, tags: Object[], card: Object}>}>} props.items One per problem with a
 *   choice, in chain order; `position` counts the chain's problems from 1.
 * @param {((position: number, visualization: string) => void)|null} props.onPick Null while
 *   the chain is being drawn: the dropdowns then show their pictures but can't open.
 * @param {Object} props.status ComputeStatus's props for the request drawing the chain again.
 */
export default function ChainPictures({ idPrefix, items, onPick, status }) {
  if (items.length === 0) return null;
  return (
    <Box id={idPrefix} sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <Box
        role="group"
        aria-label="Pictures in this chain"
        id={`${idPrefix}-row`}
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 20px" }}
      >
        {items.map((item) => (
          <Box
            key={item.position}
            id={`${idPrefix}-${item.position}-cell`}
            data-problem={item.problem}
            sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
          >
            <TaggedSelect
              id={`${idPrefix}-${item.position}`}
              label={item.problem}
              hue="cyan"
              options={item.options}
              value={item.value}
              onChange={
                onPick ? (next) => next !== item.value && onPick(item.position, next) : undefined
              }
              labelPlacement="row"
              infoPlacement="box"
              boxSx={{ flex: "0 1 240px", minWidth: 180 }}
            />
          </Box>
        ))}
      </Box>
      <ComputeStatus idPrefix={`${idPrefix}-run`} {...status} />
    </Box>
  );
}
