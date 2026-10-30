"""
C2PA content credentials: cryptographically signed provenance manifests.

This is a fact-producing tool, not a heuristic. It reports whether a manifest
is present, the C2PA validation state (Invalid | Valid | Trusted: Valid means
signature and content hashes verify; Trusted additionally means the signer is on
a configured trust list, which we do not configure), who signed it, and the IPTC
digital-source-type values the signer asserted (a standard vocabulary, e.g.
trainedAlgorithmicMedia for generative-AI output). It makes no judgement.
"""
import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

try:
    import c2pa  # type: ignore
except Exception:  # pragma: no cover
    c2pa = None


def read_c2pa(path: str | Path) -> dict:
    out = {"checked": c2pa is not None, "present": False, "validation_state": None, "valid": None,
           "signer": None, "claim_generator": None, "digital_source_types": [], "actions": [],
           "validation_failures": []}
    if c2pa is None:
        return out
    try:
        with c2pa.Reader(str(path)) as reader:
            store = json.loads(reader.json())
    except Exception as exc:
        msg = str(exc).lower()
        if "no manifest" not in msg and "manifestnotfound" not in msg.replace(" ", "") and "not found" not in msg:
            out["validation_failures"].append(str(exc)[:200])
        return out

    active = store.get("manifests", {}).get(store.get("active_manifest", ""), {})
    out["present"] = bool(active)
    out["validation_state"] = store.get("validation_state")
    out["valid"] = out["present"] and out["validation_state"] in ("Valid", "Trusted")
    failures = ((store.get("validation_results") or {}).get("activeManifest") or {}).get("failure") or []
    out["validation_failures"] = [f.get("code", "") for f in failures]
    sig = active.get("signature_info") or {}
    out["signer"] = sig.get("issuer") or sig.get("common_name")
    out["claim_generator"] = active.get("claim_generator") or (active.get("claim_generator_info") or [{}])[0].get("name")
    for a in active.get("assertions", []):
        if a.get("label", "").startswith("c2pa.actions"):
            for act in (a.get("data") or {}).get("actions", []):
                out["actions"].append(act.get("action"))
                dst = act.get("digitalSourceType")
                if dst:
                    out["digital_source_types"].append(dst.rsplit("/", 1)[-1])
    return out
