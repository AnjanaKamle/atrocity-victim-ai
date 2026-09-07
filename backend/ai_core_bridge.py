"""Makes ai_core's modules importable as top-level names (fusion,
config, emotion, crisis_detector, engagement, voice, intervention,
chat) WITHOUT editing anything inside ai_core/.

ai_core's own files use bare imports internally -- e.g. fusion.py does
`from config import WEIGHTS, THRESHOLDS` and `from intervention import
recommend_interventions`, run_demo.py does `from chat import
get_next_question`. That only works if ai_core/ itself sits directly
on sys.path (the way you'd run `python run_demo.py` from inside
ai_core/), not if ai_core is imported as a sub-package. So instead of
`from ai_core.fusion import ...`, this file inserts ai_core/ onto
sys.path and the rest of the backend does `from ai_core_bridge import
fusion, config, ...`.

Import this module before importing anything else from ai_core.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
AI_CORE_DIR = os.path.join(_PROJECT_ROOT, "ai_core")

if not os.path.isdir(AI_CORE_DIR):
    raise RuntimeError(
        f"ai_core/ not found at {AI_CORE_DIR} -- the backend/ folder must "
        "live directly next to ai_core/ (both under sih_finalMVP/)."
    )

if AI_CORE_DIR not in sys.path:
    sys.path.insert(0, AI_CORE_DIR)

import config  # noqa: E402
import emotion  # noqa: E402
import crisis_detector  # noqa: E402
import engagement  # noqa: E402
import voice  # noqa: E402
import intervention  # noqa: E402
import fusion  # noqa: E402
import chat  # noqa: E402  -- not called by any route yet (see main.py note), kept available
