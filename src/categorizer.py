"""Categorización automática de alertas regulatorias por tema.

Asigna una categoría a cada item basándose en keywords del título y resumen.
Categorías: zoning, rent, adu, construction, tax, policy, legal, other.
"""

# Orden importa: la primera coincidencia gana.
# Cada regla es (categoría, [keywords]).
_RULES = [
    ("adu", [
        "adu", "accessory dwelling", "granny flat", "backyard home",
        "junior adu", "jadu",
    ]),
    ("tax", [
        "measure ula", "mansion tax", "transfer tax", "documentary tax",
        "property tax", "tax revenue", "tax exemption", "tax collection",
    ]),
    ("legal", [
        "lawsuit", "court", "judge ruled", "judge rules", "injunction",
        "class action", "settlement", "litigation", "ruling", "appeal",
        "constitutional", "violat",
    ]),
    ("rent", [
        "rent control", "rent stabilization", "rso", "eviction",
        "tenant protection", "just cause", "relocation assistance",
        "landlord", "rental regulation", "rent cap", "rent increase",
        "moratorium", "hcidla",
    ]),
    ("construction", [
        "ladbs", "building code", "seismic retrofit", "building permit",
        "fire rebuild", "construction code", "soft-story", "soft story",
        "demolition permit", "grading permit", "inspection",
    ]),
    ("zoning", [
        "zoning", "rezone", "rezoning", "upzon", "downzon",
        "planning commission", "community plan", "specific plan",
        "height limit", "density bonus", "entitlement",
        "sb 9", "sb 10", "ab 2011", "ab 1033",
        "mixed-use", "mixed use", "land use",
        "zone change", "overlay",
    ]),
    ("policy", [
        "ordinance", "city council", "board of supervisors",
        "housing policy", "housing department", "lahd",
        "short-term rental", "str regulation", "airbnb",
        "affordable housing", "inclusionary",
        "housing element", "general plan",
        "executive directive", "mayor",
    ]),
]


def categorize(item: dict) -> str:
    """Devuelve la categoría más relevante para un item de alerta."""
    text = f"{item.get('title', '')} {item.get('summary', '')}".lower()

    for category, keywords in _RULES:
        for kw in keywords:
            if kw in text:
                return category

    return "other"


def categorize_batch(items: list[dict]) -> list[dict]:
    """Añade el campo 'category' a cada item en la lista."""
    for item in items:
        if not item.get("category"):
            item["category"] = categorize(item)
    return items
