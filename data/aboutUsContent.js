// data/aboutUsContent.js
//
// Static content for pages/aboutus.js: the project citation, publications, awards,
// theses/dissertations and grants. Ported verbatim from Redux_GUI's
// pages/aboutus/index.js. See data/helpContent.js's header for why this lives in its
// own file rather than as page-local consts.

export const PROJECT_CITATION = {
  text: "Kaden Marchetti, Andrija Sevaljevic, Alex Diviney, Caleb Eardley, Russell Phillips, Rajiv Khadka, Daniel Igbokwe, and Paul Bodily. 2024. Redux: An Interactive, Dynamic Knowledge Base for Teaching NP-completeness. In Proceedings of the 2024 on Innovation and Technology in Computer Science Education V. 1 (ITiCSE 2024). Association for Computing Machinery, New York, NY, USA, 255-261.",
  doi: "https://dl.acm.org/doi/10.1145/3649217.3653544",
  pdf: "https://portneuf.cose.isu.edu/research/publications/ITiSCE_Redux_Submission_2024_WIP.pdf",
};

export const FOUNDER = {
  name: "Dr. Paul Bodily",
  url: "https://www2.cose.isu.edu/~bodipaul/index.php",
};

export const PUBLICATIONS = [
  {
    citation:
      'P. M. Bodily, "LLMs, Computational Theory, and Redux: New Directions for CC in Computational Complexity," in Proceedings of the Workshop on Theoretical CS and Computational Creativity, 2026.',
    url: "https://computationalcreativity.net/workshops/theorycs-cc-iccc26/",
    pdf: "https://portneuf.cose.isu.edu/research/publications/bodily_cc_in_computational_complexity.pdf",
  },
  {
    citation:
      "R. Phillips and P. M. Bodily. 2025. SPADE: A library for programmatic parsing and verification of discrete data structures. In 2025 Intermountain Engineering, Technology and Computing Conference (IETC), Orem, UT, USA, pp. 1-5.",
    doi: "https://ieeexplore.ieee.org/document/11039449",
    pdf: "https://portneuf.cose.isu.edu/research/publications/SPADE.pdf",
  },
  {
    citation:
      "A. Sevaljevic and P. M. Bodily. 2024. Comparative empirical analysis of dancing links implementations to solve the exact cover problem. In 2024 Intermountain Engineering, Technology and Computing Conference (IETC), Orem, UT, USA, pp. 255-258.",
    doi: "https://ieeexplore.ieee.org/document/10564396",
    pdf: "https://portneuf.cose.isu.edu/research/publications/IETC_2024_submission_dancing_links.pdf",
  },
  {
    citation: PROJECT_CITATION.text,
    doi: PROJECT_CITATION.doi,
    pdf: PROJECT_CITATION.pdf,
  },
  {
    citation:
      "K. Marchetti and P. Bodily. 2022. KAMI: Leveraging the power of crowd-sourcing to solve complex, real-world problems. In 2022 Intermountain Engineering, Technology and Computing Conference (IETC), Orem, UT, USA, pp. 1-4. Best Student Paper Award.",
    doi: "https://ieeexplore.ieee.org/document/9796945",
    pdf: "https://portneuf.cose.isu.edu/research/publications/KAMI_Leveraging_Open_Source_to_Solve_Complex_Problems.pdf",
  },
  {
    citation:
      "K. Marchetti and P. Bodily. 2022. Visualizing the 3SAT to CLIQUE Reduction Process. In 2022 Intermountain Engineering, Technology and Computing Conference (IETC), Orem, UT, USA, pp. 1-5.",
    doi: "https://ieeexplore.ieee.org/document/9796851",
    pdf: "https://portneuf.cose.isu.edu/research/publications/Visualizing_the_3SAT_to_CLIQUE_Reduction.pdf",
  },
  {
    citation:
      'P. M. Bodily and D. Ventura, "Open computational creativity problems in computational theory," in Proceedings of the 13th International Conference on Computational Creativity (ICCC), 2022.',
    url: "https://computationalcreativity.net/iccc22/accepted-papers/",
    pdf: "https://portneuf.cose.isu.edu/research/publications/ICCC-2022_17L_Bodily-and-Ventura.pdf",
  },
];

export const AWARDS = [
  {
    citation:
      "Best Graduate Poster Presentation in Education, Learning & Training, Andrija Sevaljevic, 2026 ISU Research and Creative Works Symposium.",
    url: "https://myemail.constantcontact.com/What-s-Happening-in-CoSE.html?soid=1138359982044&aid=HHJEZevfPfU",
  },
  {
    citation:
      "Best Graduate Oral Presentation in Education, Learning & Training, Andrija Sevaljevic, 2026 ISU Research and Creative Works Symposium.",
    url: "https://myemail.constantcontact.com/What-s-Happening-in-CoSE.html?soid=1138359982044&aid=HHJEZevfPfU",
  },
];

export const THESES_AND_DISSERTATIONS = [
  {
    citation:
      'Andrija Sevaljevic, M.S. Thesis, Idaho State University, 2026, "Redux: Design and Implementation of a Reusable Web-Based Visualization System for Algorithmic and Logical Problem Solving"',
    url: "https://etd.iri.isu.edu/ViewSpecimen.aspx?ID=2565",
    pdf: "https://portneuf.cose.isu.edu/research/publications/andrija_thesis.pdf",
  },
  {
    citation:
      'Kaden Marchetti, M.S. Thesis, Idaho State University, 2023, "Redux: An Interactive, Dynamic Tool for Learning NP-completeness and Mapping Reductions"',
    url: "https://etd.iri.isu.edu/ViewSpecimen.aspx?ID=2206",
    pdf: "https://portneuf.cose.isu.edu/research/publications/kaden_thesis.pdf",
  },
];

export const GRANTS = [
  'Bodily, P.M. (Co-Lead), Bradley, J. (Co-Lead), Romney, A. (Co-PI), Petersen, J. (Co-I), "BengalBot MCP: Building AI-Literate Students at Idaho State University," U.S. Department of Education (DOE) Fund for Improvement of Post-Secondary Education (FIPSE). $300,000. 2026.',
  'Trosper, M.J., "Applied Computational Models and Algorithmic Solutions to Common Optimization Problems In Energy-Water Systems," Summer Authentic Research Experience (SARE), Idaho Community-engaged Resilience for Energy-Water Systems (I-CREWS), National Science Foundation (NSF). $6,000. 2026.',
  '"Crowd-Sourcing and Visualization of Advanced Computational Theory to Facilitate Application of Algorithmic Knowledgebase to Real-World Combinatorial Problems," Center for Advanced Energy Studies (CAES). 2024.',
  '"Application of advanced computational theory to facilitate efficient solutions to real-world combinatorial problems", Center for Advanced Energy Studies (CAES). 2022.',
  '"Interactive visualization tools for teaching computer science theory", Idaho State University Office of Research. 2022.',
];

export const GRANTS_DISCLAIMER =
  "Any opinions, findings, conclusions, or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the funding agencies who have supported this work.";

export const LICENSE_URL = "https://opensource.org/license/bsd-3-clause";
