"""Filtro de relevancia: descarta noticias no regulatorias (ej. movimientos de precios)."""

# Palabras que indican que la noticia es sobre un cambio REGULATORIO o de POLÍTICA.
REGULATORY_KEYWORDS = [
    "ordinance", "law", "regulation", "regulate", "bill ", "measure ",
    "policy", "rule", "ruling", "vote", "voted", "passes", "passed",
    "approves", "approved", "rejects", "rejected", "hearing",
    "council", "planning commission", "board of supervisors",
    "moratorium", "ban", "banned",
    "code change", "code update", "amendment", "amended",
    "prop ", "proposition", "referendum",
    "compliance", "enforcement", "requirement", "restriction",
    "rezoning", "upzoning", "downzoning",
    "signed into law", "enacted", "takes effect", "effective date",
    "lawsuit", "court", "judge ruled", "injunction",
    "SB ", "AB ", "HB ",   # bills numeration (state legislature)
    "LAHD", "LADBS", "HCIDLA",
]

# Palabras que descartan (ruido de mercado, no política).
NOISE_PENALIZERS = [
    "home prices", "median price", "sales volume", "listing price",
    "market report", "quarterly report", "index rose", "index fell",
]


def _has_any(text: str, terms: list[str]) -> bool:
    return any(term.lower() in text for term in terms)


def is_relevant(item: dict) -> bool:
    text = f"{item.get('title','')} {item.get('summary','')}".lower()
    if not _has_any(text, REGULATORY_KEYWORDS):
        return False
    # Si la nota es puramente de mercado y no menciona política además, descarta.
    if _has_any(text, NOISE_PENALIZERS) and not _has_any(text, [
        "ordinance", "law", "council", "policy", "regulation", "bill ",
        "measure ", "vote", "passed", "approved", "hearing",
    ]):
        return False
    return True
