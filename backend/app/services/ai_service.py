"""
AI Service for MaamAI.
Zero-Rupee Architecture:
1. Deterministic, rule-based classification and suggestion engine (default, ₹0 cost).
2. Optional Google Gemini Free Tier integration (when GEMINI_API_KEY is configured).
Every output transparently reports the method used ('deterministic_rule' vs 'gemini_free').
Never fabricates AI claims when deterministic logic is utilized.
"""

import re
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings

# ---------------------------------------------------------------------------
# Deterministic Academic Rule-Based Engine
# ---------------------------------------------------------------------------

URGENT_KEYWORDS = [
    "urgent", "asap", "immediate", "emergency", "deadline today",
    "critical", "action required", "time-sensitive", "exam conflict",
]

ACADEMIC_CATEGORIES = {
    "Advising & Office Hours": [
        "office hours", "advising", "appointment", "schedule a meeting",
        "consultation", "drop-in", "guidance",
    ],
    "Grading & Assignments": [
        "grade", "grading", "regrade", "assignment", "homework", "submission",
        "exam", "quiz", "midterm", "final exam", "rubric", "score",
    ],
    "Research & Publications": [
        "paper", "manuscript", "grant", "nsf", "conference", "review",
        "peer review", "journal", "experiment", "dataset", "co-author",
    ],
    "University Administration": [
        "faculty meeting", "committee", "curriculum", "department", "provost",
        "dean", "tenure", "board", "policy", "compliance",
    ],
}

def deterministic_classify_email(subject: str, body: str, sender: str) -> Dict[str, Any]:
    """
    Deterministic rule-based email classification for academic contexts.
    Zero external API calls. Cost: ₹0.
    """
    combined_text = f"{subject} {body}".lower()

    # Determine priority
    is_urgent = any(kw in combined_text for kw in URGENT_KEYWORDS)
    priority = "high" if is_urgent else "medium"

    # Determine category
    matched_category = "Student Inquiries"
    best_matches = 0

    for cat_name, keywords in ACADEMIC_CATEGORIES.items():
        matches = sum(1 for kw in keywords if kw in combined_text)
        if matches > best_matches:
            best_matches = matches
            matched_category = cat_name

    # Determine sentiment / tone
    sentiment = "neutral"
    if any(w in combined_text for w in ["thank", "grateful", "appreciate", "pleasure"]):
        sentiment = "positive"
    elif any(w in combined_text for w in ["unhappy", "frustrated", "disappointed", "struggling", "issue", "concern"]):
        sentiment = "urgent_concern" if is_urgent else "concerned"

    return {
        "category": matched_category,
        "priority": priority,
        "sentiment": sentiment,
        "confidence_score": 0.88 if best_matches > 0 else 0.72,
        "classification_method": "deterministic_rule",
        "is_ai_generated": False,
    }

def deterministic_generate_draft(
    sender_name: str,
    subject: str,
    body: str,
    tone: str,
    user_name: str,
    user_dept: str,
) -> Dict[str, Any]:
    """
    Generates a structured, respectful academic draft response using deterministic templates.
    Cost: ₹0.
    """
    first_name = sender_name.split()[0] if sender_name else "Colleague"
    clean_sub = subject.replace("Re: ", "").replace("RE: ", "").strip()
    classification = deterministic_classify_email(subject, body, sender_name)
    category = classification["category"]

    if category == "Advising & Office Hours":
        content = (
            f"Dear {first_name},\n\n"
            f"Thank you for reaching out regarding '{clean_sub}'. I would be pleased to meet with you. "
            f"Please feel free to attend my upcoming scheduled office hours or review the available slots in our calendar.\n\n"
            f"If you have specific questions or materials to discuss, please share them in advance.\n\n"
            f"Best regards,\n"
            f"{user_name}\n"
            f"{user_dept}"
        )
    elif category == "Grading & Assignments":
        content = (
            f"Dear {first_name},\n\n"
            f"Thank you for contacting me concerning '{clean_sub}'. I have received your inquiry. "
            f"Our teaching team reviews grading and coursework queries in accordance with the course syllabus. "
            f"I will inspect the recorded submission and follow up with further details shortly.\n\n"
            f"Sincerely,\n"
            f"{user_name}\n"
            f"{user_dept}"
        )
    elif category == "Research & Publications":
        content = (
            f"Dear {first_name},\n\n"
            f"Thank you for your message regarding '{clean_sub}'. I have noted the details and will review the "
            f"materials in detail. Let us synchronize our next steps during our upcoming research group session.\n\n"
            f"With best regards,\n"
            f"{user_name}\n"
            f"{user_dept}"
        )
    else:
        content = (
            f"Dear {first_name},\n\n"
            f"Thank you for reaching out regarding '{clean_sub}'. I have received your message and will review "
            f"the details as soon as possible.\n\n"
            f"Best regards,\n"
            f"{user_name}\n"
            f"{user_dept}"
        )

    return {
        "suggested_body": content,
        "tone": tone or "Academic & Professional",
        "confidence_score": 0.90,
        "generation_method": "deterministic_rule",
        "is_ai_generated": False,
    }

# ---------------------------------------------------------------------------
# Optional Gemini Free Tier Engine
# ---------------------------------------------------------------------------

def gemini_generate_draft(
    sender_name: str,
    subject: str,
    body: str,
    tone: str,
    user_name: str,
    user_dept: str,
) -> Optional[Dict[str, Any]]:
    """
    Optional: Generates suggestion via Google Gemini Free API if configured.
    Falls back gracefully if quota is exhausted or API is unavailable.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key or settings.AI_PROVIDER != "gemini_free":
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = (
        f"You are an executive academic assistant for {user_name}, {user_dept}. "
        f"Draft a concise, professional, {tone} email response to {sender_name} regarding subject '{subject}'.\n"
        f"Original message snippet: {body[:300]}\n"
        f"Sign off with {user_name}, {user_dept}. Do not include placeholder brackets like [Your Name]."
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "suggested_body": text.strip(),
                    "tone": tone,
                    "confidence_score": 0.95,
                    "generation_method": "gemini_free",
                    "is_ai_generated": True,
                }
    except Exception:
        pass

    return None

def generate_draft_response(
    sender_name: str,
    subject: str,
    body: str,
    tone: str,
    user_name: str,
    user_dept: str,
) -> Dict[str, Any]:
    """
    Primary draft generation dispatcher:
    Attempts Gemini Free if configured; otherwise returns deterministic fallback.
    """
    if settings.GEMINI_API_KEY and settings.AI_PROVIDER == "gemini_free":
        res = gemini_generate_draft(sender_name, subject, body, tone, user_name, user_dept)
        if res:
            return res

    return deterministic_generate_draft(sender_name, subject, body, tone, user_name, user_dept)
