"""Pitch/energy extraction via librosa. Language-agnostic since it
works on the acoustic signal, not transcribed words."""

import numpy as np
import librosa


def extract_prosody_features(audio_path: str) -> dict:
    y, sr = librosa.load(audio_path, sr=16000)
    f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"))
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else np.array([])

    rms = librosa.feature.rms(y=y)[0]
    return {
        "pitch_mean": float(np.nanmean(voiced_f0)) if voiced_f0.size else 0.0,
        "pitch_std": float(np.nanstd(voiced_f0)) if voiced_f0.size else 0.0,
        "energy_mean": float(np.mean(rms)),
        "voiced_ratio": float(np.mean(voiced_flag)) if voiced_flag is not None else 0.0,
    }


def stress_score_from_baseline(current: dict, baseline: dict) -> dict:
    if not baseline:
        return {"voice_stress": 0.5, "driver": "no baseline yet"}

    def pct_dev(cur, base):
        return 0.0 if base == 0 else (cur - base) / base

    pitch_dev = pct_dev(current["pitch_mean"], baseline["pitch_mean"])
    pitch_var_dev = pct_dev(current["pitch_std"], baseline["pitch_std"])
    energy_drop = -pct_dev(current["energy_mean"], baseline["energy_mean"])

    raw = 0.4 * max(0, pitch_dev) + 0.3 * max(0, pitch_var_dev) + 0.3 * max(0, energy_drop)
    drivers = {"pitch elevation": pitch_dev, "pitch instability": pitch_var_dev, "energy drop": energy_drop}

    return {
        "voice_stress": round(max(0.0, min(1.0, 0.5 + raw)), 3),
        "driver": max(drivers, key=drivers.get),
    }


def stress_score_stub(seed: float = 0.5) -> dict:
    return {"voice_stress": seed, "driver": "stub (no audio channel)"}
