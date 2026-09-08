"""Fuentes de noticias regulatorias sobre bienes raíces en Los Ángeles.

Estrategia principal: Google News RSS con queries muy dirigidas.
Cada query se convierte en un feed RSS que devuelve titulares + enlaces.
Añade o modifica QUERIES para afinar el radar.
"""
import hashlib
import sys
from urllib.parse import quote

import feedparser

GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"

# Cada línea es una búsqueda. Están en inglés porque la prensa/regulador es en inglés.
# Los operadores AND/OR y comillas siguen la sintaxis de Google.
QUERIES = [
    '"Los Angeles" (zoning OR "rent control" OR "rent stabilization" OR RSO)',
    '"Los Angeles" ("Measure ULA" OR "mansion tax" OR "transfer tax")',
    '"Los Angeles" ("housing ordinance" OR "housing policy" OR LAHD)',
    '"Los Angeles" ("short-term rental" OR STR OR Airbnb) (regulation OR ban OR permit)',
    '"Los Angeles" ("eviction moratorium" OR "tenant protections" OR "just cause")',
    '"Los Angeles" (LADBS OR "building code" OR "seismic retrofit")',
    '"Los Angeles" ("ADU" OR "accessory dwelling") (ordinance OR rule OR permit)',
    '"Los Angeles" "City Council" (housing OR real estate OR development)',
    '"Los Angeles" "Planning Commission" (approved OR rejected OR hearing)',
    'California ("SB 9" OR "SB 10" OR "AB 2011" OR "AB 1033") housing',
    '"Los Angeles County" (housing OR "real estate") (ordinance OR regulation)',
]


def _hash_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]


def _google_news_url(query: str) -> str:
    return f"{GOOGLE_NEWS_BASE}?q={quote(query)}&hl=en-US&gl=US&ceid=US:en"


def fetch_google_news(query: str) -> list[dict]:
    url = _google_news_url(query)
    feed = feedparser.parse(url)
    items = []
    for entry in feed.entries:
        link = entry.get("link", "")
        title = entry.get("title", "").strip()
        if not link or not title:
            continue
        # feedparser expone la fuente de Google News como entry.source.title
        source_title = ""
        src = entry.get("source")
        if isinstance(src, dict):
            source_title = src.get("title", "")
        elif hasattr(entry, "source"):
            source_title = getattr(entry.source, "title", "") or ""

        items.append({
            "id": _hash_id(link),
            "title": title,
            "link": link,
            "source": source_title or "Google News",
            "published": entry.get("published", ""),
            "summary": entry.get("summary", ""),
            "query": query,
        })
    return items


def fetch_all() -> list[dict]:
    """Consulta todas las fuentes y devuelve items únicos."""
    all_items: list[dict] = []
    for q in QUERIES:
        try:
            fetched = fetch_google_news(q)
            print(f"  [{len(fetched):>3}] {q}")
            all_items.extend(fetched)
        except Exception as e:
            print(f"  ERROR consultando '{q}': {e}", file=sys.stderr)

    # Deduplicar por id
    seen: set[str] = set()
    unique: list[dict] = []
    for item in all_items:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        unique.append(item)
    return unique
