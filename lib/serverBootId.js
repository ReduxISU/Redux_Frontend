// lib/serverBootId.js
//
// T43 (#65). One identifier per server process, so the Home page's startup
// animation can play once when the server starts and then stay out of the
// way until it is restarted.
//
// This module is evaluated once, the first time the server imports it, and
// the constant below is fixed for the life of that process. Every request
// that process serves therefore reports the same id, and a request served
// after a restart reports a different one. That difference is the whole
// mechanism: components/StartupSplash.js remembers the last id it played
// for and only plays again when it sees a new one.
//
// Deliberately not a timestamp alone. Two processes started in the same
// millisecond on the same machine would collide, and while that is unlikely
// here it would be invisible when it happened -- the splash would simply
// stop playing after a restart, with nothing to point at. The pid and the
// random suffix make a collision not worth thinking about.
//
// Server-only. pages/index.js imports it inside getServerSideProps, which
// Next.js strips from the client bundle, so `process` is never referenced
// in browser code.

export const SERVER_BOOT_ID = [
  Date.now().toString(36),
  process.pid.toString(36),
  Math.random().toString(36).slice(2, 8),
].join("-");
