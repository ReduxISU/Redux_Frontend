// pages/contribute.js
//
// The Contribute page: why and how to contribute to Redux, a setup tutorial video,
// and the project maintainer's contact. Ported from Redux_GUI's
// pages/contribute/index.js -- content unchanged, rebuilt against this app's own
// layout/theme.
//
// Added by direct project-owner instruction. See pages/help.js's header for the
// "Not in v1" note this supersedes.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ContentSection from "../components/ContentSection";
import ExternalLinkList from "../components/ExternalLinkList";
import NavBar from "../components/NavBar";
import {
  CONTRIBUTION_STEPS,
  HELPFUL_LINKS,
  MAINTAINER_CONTACT_EMAIL,
  MAINTAINER_NAME,
  TUTORIAL_VIDEO,
} from "../data/contributeContent";

export default function ContributePage() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 3, sm: 5 },
          py: 4,
          maxWidth: 820,
          width: "100%",
          mx: "auto",
        }}
      >
        <Typography variant="h1" component="h1">
          Contribute
        </Typography>

        <ContentSection title="Contribute to Redux">
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Redux depends on contributors like you.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Our goal from the beginning has not been to build a knowledge base ourselves but to
            build a framework for crowd-sourced contribution across the world, think Wikipedia. We
            hope to see contributors add everything from new problems, algorithms, reductions,
            visualizations, features, bug fixes, and beyond. Our goal is to make the framework easy
            to understand and even easier to extend. Below are tutorials and helpful information to
            get you started.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Any contribution to Redux requires:
          </Typography>
          <Box sx={{ display: "grid", gap: 1 }}>
            {CONTRIBUTION_STEPS.map((step) => (
              <Box
                key={step}
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>
        </ContentSection>

        <ContentSection title="Tutorial Videos">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Here are tutorial videos for each of these steps:
          </Typography>
          <Box
            sx={{
              width: "100%",
              borderRadius: 1.5,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <iframe
              width="100%"
              height="420"
              src={TUTORIAL_VIDEO.embedUrl}
              title={TUTORIAL_VIDEO.title}
              style={{ border: "none", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        </ContentSection>

        <ContentSection title="Checklist for a Successful Pull Request">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Before submitting a pull request, make sure your changes run locally, follow the
            existing project structure, include clear descriptions of the work completed, and are
            tested carefully. Additional checklist details will be added as the contribution
            documentation is expanded.
          </Typography>
        </ContentSection>

        <ContentSection title="Helpful Links">
          <ExternalLinkList idPrefix="contribute-helpful" links={HELPFUL_LINKS} />
        </ContentSection>

        <ContentSection title="Get Involved">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Interested in getting more involved? We love collaboration! Whether you are an industry
            partner, a university research group, or an individual passionate about getting
            involved, we have lots of project ideas we could use your help with. If interested,
            please reach out to {MAINTAINER_NAME} at{" "}
            <Link
              id="contribute-maintainer-email"
              href={`mailto:${MAINTAINER_CONTACT_EMAIL}`}
              underline="hover"
              sx={{ color: "primary.light", fontWeight: 600 }}
            >
              {MAINTAINER_CONTACT_EMAIL}
            </Link>
            .
          </Typography>
        </ContentSection>

        <ContentSection title="Terms of Use">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Terms of Use content will be added here. This section is intended to describe
            expectations and conditions for using Redux.
          </Typography>
        </ContentSection>

        <ContentSection title="Privacy Policy">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Privacy Policy content will be added here. This section is intended to explain what
            information is collected, how it is used, and how user privacy is protected.
          </Typography>
        </ContentSection>
      </Box>
    </Box>
  );
}
