"""Tunable values. Weights/thresholds are placeholders until the psych
team finalizes them against the literature review."""

WEIGHTS = {"text": 0.4, "voice": 0.3, "engagement": 0.3}
THRESHOLDS = {"low": 40, "high": 60}  # counsellor / officer tiers
ESCALATION_SLOPE = 4.0

CRISIS_TRIGGERS_EN = [
    "kill myself", "end my life", "don't want to live", "better off dead",
    "no reason to live", "can't go on", "want to die", "can't sleep", "not feeling hungry", "helpless",
]
CRISIS_TRIGGERS_HI = [
    "khatam kar", "jeena nahi chahta", "jeena nahi chahti",
    "marna chahta hoon", "marna chahti hoon", "jeene ka koi matlab nahi", "bhook nahi lagri","neend nahi ari",
]

INTERVENTION_CATEGORIES = [
    "counselling", "medical", "witness_protection", "relocation",
    "financial_assistance", "legal_aid", "rehabilitation",
]

CASE_TYPES = [
    "rape", "murder_grievous_arson",
    "witness_intimidation", "caste_violence", "unspecified","acid attacks","sexual harrasment","monetary scams",
]

# --- Conversational check-in ---
HF_MODEL_ID = "ai4bharat/Airavata"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"

# SRQ-20-inspired, kept short for a hackathon demo. Not clinically
# reviewed -- psych team should replace before real use.
CHECKIN_QUESTIONS = [
    "Aap aajkal neend theek se le pa rahe hain?",
    "Kya aapko baar baar dar ya ghabrahat mehsoos hoti hai?",
    "Kya aap logon se milna-julna kam kar diya hai?",
    "Kya aapko lagta hai koi aapki madad kar sakta hai?",
]
