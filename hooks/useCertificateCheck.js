// hooks/useCertificateCheck.js
//
// #229 stage 3, reworked by #279 stage 4 (board F): the state behind the Verify section's strips
// (components/workbench/panels/VerifyBox.js). One strip per side: the problem's own (the source)
// always, and the reduction's target in Reduce mode. Each side checks its own problem against its
// own instance, with its own certificate, request and verdict, so there is no "Check against"
// switch any more.
//
// It lives in the Workbench, not the strips, because Check it in Execute fills a side's field and
// checks it there, and because a strip that is collapsed or hidden must keep what was typed.
//
// A verdict is shown while it still describes what is on screen: the same certificate, instance
// and verifier it was checked with. Once any of them changes it is "stale" (the strip says to
// check again). Nothing is cleared by an effect: a verdict simply stops matching.

import { useRef, useState } from "react";
import { readVerdict } from "../components/detail/VerifierSection";
import { REDUX_API_BASE_URL, requestVerifiedInstance } from "../lib/redux";
import { COMPUTE_DONE, COMPUTE_FAILED, useComputeRequest } from "./useComputeRequest";

export const CHECK_SOURCE = "source";
export const CHECK_TARGET = "target";

/**
 * @typedef {Object} VerifySideInfo
 * @property {string} name The side's problem ("3SAT").
 * @property {Object|null} verifier Its verifier, as hooks/useProblemDetail.js builds it.
 * @property {string|null} instance The instance a certificate is checked against; null until
 *   Reduce has built one (the target side).
 */

/**
 * One side's check.
 * @param {VerifySideInfo|null} info
 * @param {string} certificate What is in the side's field.
 * @param {(text: string) => void} setCertificate
 */
function useSideCheck(info, certificate, setCertificate) {
  const request = useComputeRequest({ subject: "certificate" });
  const checkCountRef = useRef(0);
  // What the last check was of, so a verdict or an unreadable certificate can tell it is stale.
  const [checkedWith, setCheckedWith] = useState(null);

  const className = info?.verifier?.className ?? null;
  const instance = info?.instance ?? null;

  /** Checks the field, or `override` (Check it, Use the solver's answer), which fills it too. */
  function check(override) {
    const text = override ?? certificate;
    if (!className || !instance?.trim() || !text.trim()) return;
    if (override !== undefined) setCertificate(override);
    checkCountRef.current += 1;
    const id = checkCountRef.current;
    setCheckedWith({ instance, certificate: text, className });
    request.start(async (signal) => {
      const raw = await requestVerifiedInstance(
        REDUX_API_BASE_URL,
        className,
        instance,
        text,
        signal,
      );
      return { ...readVerdict(raw), id };
    });
  }

  const current =
    checkedWith !== null &&
    checkedWith.instance === instance &&
    checkedWith.certificate === certificate &&
    checkedWith.className === className;
  const verdict = request.status === COMPUTE_DONE ? request.result : null;
  const unreadable =
    request.status === COMPUTE_FAILED && request.failure?.code === "certificate_parse_error"
      ? request.failure
      : null;

  return {
    info,
    certificate,
    setCertificate,
    check,
    request,
    /** The verdict while it is of what is on screen. */
    verdict: current ? verdict : null,
    /** Redux could not read the certificate in the field. */
    unreadable: current ? unreadable : null,
    /** A verdict, or an unreadable certificate, for an earlier certificate or instance. */
    stale: !current && (verdict !== null || unreadable !== null),
  };
}

/**
 * @param {Object} options
 * @param {VerifySideInfo} options.source The problem's own side.
 * @param {VerifySideInfo|null} options.target Reduce mode's target side, or null in Solve mode.
 */
export function useCertificateCheck({ source, target }) {
  const [certificates, setCertificates] = useState({ [CHECK_SOURCE]: "", [CHECK_TARGET]: "" });
  const setter = (side) => (text) => setCertificates((previous) => ({ ...previous, [side]: text }));

  const sourceSide = useSideCheck(source, certificates[CHECK_SOURCE], setter(CHECK_SOURCE));
  const targetSide = useSideCheck(target, certificates[CHECK_TARGET], setter(CHECK_TARGET));

  return {
    [CHECK_SOURCE]: sourceSide,
    // The target's field keeps its text in Solve mode, ready for the next Reduce.
    [CHECK_TARGET]: target ? targetSide : null,
  };
}
