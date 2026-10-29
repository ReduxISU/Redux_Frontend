// hooks/useCertificateCheck.js
//
// #229 stage 3: the state behind one certificate check. #303 stage 4 (Board G) has three: the
// Verify tab's, and the two of Reduce's Verify stage (the target's answer against the target
// instance, and the answer mapped back against this instance), which can run at the same time,
// so each is its own request. The Workbench owns them all: their verdicts are result rows, and
// the Verify tab's also goes on the picture's Showing line.
//
// What one owns: the check request itself and the verdict it produced. The certificate text is
// the caller's (Reduce's are prefilled from its Solve stage). Each verdict carries what it was
// checked with (verifier, instance, certificate) and the `context` the caller passed at the time
// (the workbench passes its mode and run), so the caller can tell whether a verdict still
// describes what is on screen. Nothing here is cleared by an effect: a verdict for an older
// instance, certificate or run simply stops being current.

import { useRef } from "react";
import { readVerdict } from "../components/detail/VerifierSection";
import { REDUX_API_BASE_URL, requestVerifiedInstance } from "../lib/redux";
import { COMPUTE_DONE, useComputeRequest } from "./useComputeRequest";

/**
 * Whether a check can run: a verifier the backend can be asked for, an instance and a
 * certificate.
 * @param {{verifier: Object|null, instance: string|null, certificate: string}} check
 */
export function canCheck({ verifier, instance, certificate }) {
  return Boolean(verifier?.className) && Boolean(instance?.trim()) && certificate.trim() !== "";
}

export function useCertificateCheck() {
  const request = useComputeRequest({ subject: "certificate" });
  const checkCountRef = useRef(0);

  /**
   * Checks `certificate` with `verifier` against `instance`. Does nothing when it can't run.
   * @param {{verifier: Object|null, instance: string|null, certificate: string, label: string,
   *   context: string}} options `label` names what it is checked against ("3SAT instance").
   */
  function check({ verifier, instance, certificate, label, context }) {
    if (!canCheck({ verifier, instance, certificate })) return;
    checkCountRef.current += 1;
    const id = checkCountRef.current;
    request.start(async (signal) => {
      const raw = await requestVerifiedInstance(
        REDUX_API_BASE_URL,
        verifier.className,
        instance,
        certificate,
        signal,
      );
      return {
        ...readVerdict(raw),
        id,
        verifierClassName: verifier.className,
        verifierName: verifier.name,
        label,
        instance,
        certificate,
        context,
      };
    });
  }

  const verdict = request.status === COMPUTE_DONE ? request.result : null;

  return { check, request, verdict };
}

/**
 * Whether `verdict` still describes this check: the same verifier, instance and certificate,
 * asked in the same context.
 */
export function verdictMatches(verdict, { verifier, instance, certificate, context }) {
  return (
    Boolean(verdict) &&
    verdict.verifierClassName === verifier?.className &&
    verdict.instance === instance &&
    verdict.certificate === certificate &&
    verdict.context === context
  );
}
