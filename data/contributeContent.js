// data/contributeContent.js
//
// Static content for pages/contribute.js. Ported from Redux_GUI's
// pages/contribute/index.js. See data/helpContent.js's header for why this lives in
// its own file rather than as page-local consts.

export const CONTRIBUTION_STEPS = [
  "Creating a fork of the appropriate repository, front end or back end",
  "Getting Redux running locally for development and testing",
  "Downloading, editing, and integrating templates",
  "Submitting a successful pull request",
];

export const HELPFUL_LINKS = [
  { label: "GitHub", url: "https://github.com/ReduxISU/" },
  { label: "Swagger", url: "https://api.redux.portneuf.cose.isu.edu/swagger/index.html" },
];

export const TUTORIAL_VIDEO = {
  title: "Redux Setup Tutorial",
  embedUrl: "https://www.youtube.com/embed/9vTl522tyhU",
};

export const MAINTAINER_CONTACT_EMAIL = "bodipaul@isu.edu";
export const MAINTAINER_NAME = "Dr. Paul Bodily";
