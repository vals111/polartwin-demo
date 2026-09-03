from typing import List, Dict, Any

def explain_risk_score(risk_data: dict) -> str:
    score = risk_data.get("score", 0.0)
    level = risk_data.get("level", "LOW")
    factors = risk_data.get("contributing_factors", [])

    if level == "LOW":
        return f"Station operations are nominal (Risk Score: {score}/100). All life support, energy, and reserves are within safe operating margins."

    top_factors = factors[:3]
    factor_texts = [f"{f['factor']} ({int(f['weight'] * 100)}% contribution)" for f in top_factors]
    explanation = (
        f"Station risk elevated to {level} ({score}/100). "
        f"Primary risk drivers: {', '.join(factor_texts)}. "
        f"Mitigation measures recommended to prevent escalation."
    )
    return explanation

def explain_alert(alert_type: str, context: dict) -> str:
    reasons = {
        "fuel_low": f"Fuel reserve fell to {context.get('pct', 0)}%, below the 30% watch threshold. At current burn of {context.get('burn', 0)} L/hr, estimated margin is {context.get('days', 0)} days.",
        "blizzard": f"Katabatic storm severity index reached {context.get('storm', 0):.2f} with sustained winds of {context.get('wind', 0)} km/h. Solar array obscured and outdoor field ops suspended.",
        "generator_overload": f"Generator operating at {context.get('load', 0)} kW. Heating demand increased due to external temperature of {context.get('temp', 0)}°C.",
        "water_freeze": f"Water intake trace heating pipe temperature dropped to {context.get('pipe_temp', 0)}°C under sub-zero ambient cold. Risk of ice plug blockage.",
        "equipment_degradation": f"Equipment {context.get('name', 'Asset')} health dropped to {context.get('health', 0)}% after {context.get('hours', 0)} operating hours."
    }
    return reasons.get(alert_type, f"Telemetry threshold deviation detected in {alert_type}.")
