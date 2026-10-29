// components/pictures/zoomControlsSlot.js
//
// #303 (Board G): where a picture's zoom buttons go. The workbench's picture pane puts them on
// its header row, beside the Picture menu and Full screen, when it shows one picture; it
// provides that row's element here, and DiagramZoom.js renders its Zoom group into it (a
// portal, so the buttons keep their ids, labels and behavior). With no slot (the Reduction
// View's two pictures, or a picture outside the workbench) the buttons stay above the picture.

import { createContext } from "react";

/** The element the Zoom group renders into, or null to keep it above the picture. */
export const ZoomControlsSlot = createContext(null);
