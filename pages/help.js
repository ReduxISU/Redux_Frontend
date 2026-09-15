// pages/help.js
//
// The Help page: background reading on the complexity-theory concepts Redux's
// taxonomy is built on, how to access the backend directly, and links to further
// documentation. Ported from Redux_GUI's pages/help/index.js -- content unchanged,
// rebuilt against this app's own layout/theme instead of Redux_GUI's
// ResponsiveAppBar/StaticSection/textColors(mode).
//
// Added by direct project-owner instruction. CLAUDE.md's "Not in v1" list named Help
// and Contribute as out of scope for v1 (NavBar.js's chrome links were left disabled
// for exactly that reason) -- superseded here; NavBar.js's Help link is wired to this
// route as part of the same change.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ContentSection from "../components/ContentSection";
import ExternalLinkList from "../components/ExternalLinkList";
import NavBar from "../components/NavBar";
import { ACCESS_LINKS, BACKGROUND_READING_LINKS, LEARN_MORE_LINKS } from "../data/helpContent";

// The one nested (one level deep) list on this page -- kept local rather than in
// components/, since nothing else needs a two-level bulleted link list.
function BackgroundReadingList({ links }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {links.map((link, index) => (
        <Box component="li" key={link.url} sx={{ mb: 0.75 }}>
          <Link
            id={`help-background-link-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ color: "primary.light", fontWeight: 600 }}
          >
            {link.label}
          </Link>
          {link.children && (
            <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 3 }}>
              {link.children.map((child, childIndex) => (
                <Box component="li" key={child.url} sx={{ mb: 0.5 }}>
                  <Link
                    id={`help-background-link-${index}-${childIndex}`}
                    href={child.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ color: "primary.light", fontWeight: 600 }}
                  >
                    {child.label}
                  </Link>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default function HelpPage() {
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
          Help
        </Typography>

        <ContentSection title="Welcome to Redux">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Redux is a dynamic, interactive computer science knowledgebase consisting of canonical
            computer science problems, solutions, and reduction algorithms. The following pages
            provide helpful background to the organization of problems, solutions, and reductions in
            Redux based on the concept of complexity classes:
          </Typography>
          <BackgroundReadingList links={BACKGROUND_READING_LINKS} />
        </ContentSection>

        <ContentSection title="Access Redux Content">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            All of the content of the Redux knowledge base can be accessed directly via:
          </Typography>
          <ExternalLinkList
            idPrefix="help-access"
            links={ACCESS_LINKS}
            trailingItem="C# Library import (instructions coming soon)"
          />
        </ContentSection>

        <ContentSection title="Learn More">
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Additional documentation can be found at the following links:
          </Typography>
          <ExternalLinkList idPrefix="help-learn-more" links={LEARN_MORE_LINKS} />
        </ContentSection>
      </Box>
    </Box>
  );
}
