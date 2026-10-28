// components/PageTitle.js
//
// #279: names the browser tab. pages/_app.js titles every page "Redux"; a page that names a
// problem titles its tab by the problem's display name instead ("Vertex Cover · Redux").

import Head from "next/head";

/**
 * @param {Object} props
 * @param {string} props.title What the page shows, e.g. "Vertex Cover"; " · Redux" is added.
 */
export default function PageTitle({ title }) {
  return (
    <Head>
      <title>{`${title} · Redux`}</title>
    </Head>
  );
}
