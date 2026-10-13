// hooks/useCertificateCheck.js
//
// #229 stage 3: the state behind the workbench's Verify section (components/workbench/panels/
// VerifyBox.js). It lives in the Workbench, not the box, because the verdict also shows on the
// picture pane's Showing line and "Verify This Answer" in the Result panel fills the box.
//
// What it owns:
//   - Which side Check is against. In Solve mode that is always the problem's own instance. In
//     Reduce mode the "Check against" switch picks the source instance or the target instance
//     the reduction built; the target side is locked until a run has built one.
//   - One certificate per side, so switching sides does not lose what was typed.
//   - The check request itself, and the verdict it produced. Each verdict carries what it was
//     checked against (side, instance, certificate) and the `context` the caller passed at the
//     time (the workbench passes its mode and run), so the caller can tell whether a verdict
//     still describes what is on screen. Nothing here is cleared by an effect: a verdict for an
//     older instance or run simply stops being current.

import { useRef, useState } from "react";
import { readVerdict } from "../components/detail/VerifierSection";
import { REDUX_API_BASE_URL, requestVerifiedInstance } from "../lib/redux";
import { COMPUTE_DONE, useComputeRequest } from "./useComputeRequest";

export const CHECK_SOURCE = "source";
export const CHECK_TARGET = "target";

/**
 * @param {Object} options
 * @param {{name: string, label: string, verifier: Object|null, instance: string}} options.source
 *   The problem's own side: its name, how the certificate box names it ("3SAT instance"), its
 *   verifier and the current instance.
 * @param {{name: string, label: string, verifier: Object|null, instance: string|null}|null}
 *   options.target Reduce mode's target side, or null in Solve mode. `instance` is null until a
 *   run has built the target instance, which keeps the target side locked.
 * @param {string} options.context Who is asking right now (the workbench passes its mode and
 *   run), stored on each verdict so the caller can tell a current one from a stale one.
 */
export function useCertificateCheck({ source, target, context }) {
  const [checkOn, setCheckOnState] = useState(CHECK_SOURCE);
  const [certificates, setCertificates] = useState(() => ({
    [CHECK_SOURCE]: source.verifier?.exampleCertificate ?? "",
    [CHECK_TARGET]: "",
  }));
  const request = useComputeRequest({ subject: "certificate" });
  const checkCountRef = useRef(0);

  const targetLocked = !target || !target.instance;
  const side = target && checkOn === CHECK_TARGET && !targetLocked ? CHECK_TARGET : CHECK_SOURCE;
  const sides = { [CHECK_SOURCE]: source, [CHECK_TARGET]: target };
  const current = sides[side];

  // Not guarded by the lock on purpose: after a reduction the workbench asks for the target
  // side in the same moment the target instance arrives. While locked, `side` above falls
  // back to the source, and the switch's target button is disabled.
  function setCheckOn(next) {
    setCheckOnState(next);
  }

  function setCertificate(text, onSide = side) {
    setCertificates((previous) => ({ ...previous, [onSide]: text }));
  }

  /**
   * Checks a certificate. With no arguments it checks what is in the box on the current side;
   * Verify This Answer passes the answer (and the side it belongs to), which also goes into
   * that side's box.
   */
  function check(certificateOverride, sideOverride) {
    const onSide = sideOverride ?? side;
    const info = sides[onSide];
    const certificate = certificateOverride ?? certificates[onSide];
    if (!info?.verifier?.className || !info.instance?.trim() || !certificate.trim()) return;
    if (certificateOverride !== undefined) setCertificate(certificateOverride, onSide);
    if (sideOverride) setCheckOnState(sideOverride);
    checkCountRef.current += 1;
    const id = checkCountRef.current;
    const instanceAtCheck = info.instance;
    const contextAtCheck = context;
    const verifierClassName = info.verifier.className;
    request.start(async (signal) => {
      const raw = await requestVerifiedInstance(
        REDUX_API_BASE_URL,
        verifierClassName,
        instanceAtCheck,
        certificate,
        signal,
      );
      return {
        ...readVerdict(raw),
        id,
        side: onSide,
        problemName: info.name,
        label: info.label,
        instance: instanceAtCheck,
        certificate,
        context: contextAtCheck,
      };
    });
  }

  const verdict = request.status === COMPUTE_DONE ? request.result : null;

  return {
    checkOn: side,
    setCheckOn,
    targetLocked,
    current,
    certificate: certificates[side],
    setCertificate: (text) => setCertificate(text),
    check,
    request,
    verdict,
  };
}
