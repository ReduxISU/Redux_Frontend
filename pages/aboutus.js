// pages/aboutus.js
//
// The About Us page: what Redux is, the project citation, the contributor directory
// (with each contributor's full profile, GitHub activity and code credit behind a
// dialog), publications, awards, theses and dissertations, grant support, and the
// license. Ported from Redux_GUI's pages/aboutus/index.js -- content and the
// contributor feature set unchanged, split into components/aboutus/ instead of one
// 1000+ line page file, and restyled against this app's theme.
//
// Added by direct project-owner instruction. About Us did not exist as a concept when
// CLAUDE.md's "Not in v1" list was written, so nothing there names it -- but the same
// project-owner authorization pages/help.js and pages/contribute.js record applies
// here too. NavBar.js gained a real "About Us" link as part of this same change.
//
// The contributor directory/profile fetches need two backend endpoints
// (Navigation/ContributorProfile/directory and /{name}) that were not on this app's
// proxy allowlist before this page -- see pages/api/redux/[...path].js's
// ALLOWED_PREFIX_ENDPOINTS for how the second one (a variable contributor name in the
// path itself, not a query string) is allowed without opening the proxy to arbitrary
// paths.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import CitationList from "../components/aboutus/CitationList";
import ContributorList from "../components/aboutus/ContributorList";
import ContentSection from "../components/ContentSection";
import NavBar from "../components/NavBar";
import {
  AWARDS,
  FOUNDER,
  GRANTS,
  GRANTS_DISCLAIMER,
  LICENSE_URL,
  PROJECT_CITATION,
  PUBLICATIONS,
  THESES_AND_DISSERTATIONS,
} from "../data/aboutUsContent";

export default function AboutUsPage() {
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
          maxWidth: 980,
          width: "100%",
          mx: "auto",
        }}
      >
        <Typography variant="h1" component="h1">
          About Us
        </Typography>

        <ContentSection title="About Us" collapsible sectionKey="aboutus-intro">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Welcome to{" "}
            <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
              Redux
            </Box>
            , a dynamic, interactive computer science knowledgebase consisting of canonical computer
            science problems, solutions, and reduction algorithms. Join our community of problem
            solvers and unravel computational complexities using the application library. The
            project was greatly inspired by Richard Karp&apos;s paper{" "}
            <Link
              id="aboutus-karp-paper-link"
              href="https://link.springer.com/chapter/10.1007/978-1-4684-2001-2_9"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "primary.light", fontWeight: 600 }}
            >
              &quot;Reducibility Among Combinatorial Problems&quot;
            </Link>{" "}
            (Karp, 1972).
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            When citing Redux, please use the following citation:
          </Typography>

          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {PROJECT_CITATION.text}{" "}
              <Link
                id="aboutus-citation-doi"
                href={PROJECT_CITATION.doi}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ color: "primary.light", fontWeight: 600, ml: 0.5 }}
              >
                [DOI]
              </Link>
              <Link
                id="aboutus-citation-pdf"
                href={PROJECT_CITATION.pdf}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ color: "primary.light", fontWeight: 600, ml: 0.5 }}
              >
                [PDF]
              </Link>
            </Typography>
          </Box>
        </ContentSection>

        <ContentSection title="Contributors" collapsible sectionKey="contributors">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            This project was started by{" "}
            <Link
              id="aboutus-founder-link"
              href={FOUNDER.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "primary.light", fontWeight: 600 }}
            >
              {FOUNDER.name}
            </Link>
            , who is also the ISU Faculty Sponsor of the project.
          </Typography>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Project contributors
          </Typography>
          <ContributorList />
        </ContentSection>

        <ContentSection title="Publications" collapsible sectionKey="publications">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Below are research publications associated with the Redux project and its contributors.
          </Typography>
          <CitationList idPrefix="aboutus-publication" citations={PUBLICATIONS} />
        </ContentSection>

        <ContentSection title="Awards" collapsible sectionKey="awards">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Below are awards associated with the Redux project and its contributors.
          </Typography>
          <CitationList idPrefix="aboutus-award" citations={AWARDS} />
        </ContentSection>

        <ContentSection title="Theses and Dissertations" collapsible sectionKey="theses">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Below are theses and dissertations associated with the Redux project.
          </Typography>
          <CitationList idPrefix="aboutus-thesis" citations={THESES_AND_DISSERTATIONS} />
        </ContentSection>

        <ContentSection title="Support" collapsible sectionKey="support">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Redux has been supported by the following grants:
          </Typography>
          <Box sx={{ display: "grid", gap: 1 }}>
            {GRANTS.map((grant) => (
              <Box
                key={grant}
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {grant}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {GRANTS_DISCLAIMER}
          </Typography>
        </ContentSection>

        <ContentSection title="License" collapsible sectionKey="license">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            This work is licensed under the{" "}
            <Link
              id="aboutus-license-link"
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "primary.light", fontWeight: 600 }}
            >
              BSD 3-Clause License
            </Link>
            .
          </Typography>
        </ContentSection>
      </Box>
    </Box>
  );
}
