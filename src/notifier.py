"""Envío de alertas por Telegram."""
import html
import sys
from typing import List

import requests

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
MAX_PER_MESSAGE = 8   # límite razonable por mensaje (Telegram acepta hasta ~4096 chars)
TIMEOUT = 30

# Emojis por categoría
CATEGORY_EMOJI = {
    "zoning":       "🏗️",
    "rent":         "🏠",
    "adu":          "🏡",
    "construction": "🔨",
    "tax":          "💰",
    "policy":       "📜",
    "legal":        "⚖️",
    "other":        "📄",
}


class TelegramNotifier:
    def __init__(self, token: str, chat_ids: List[str]):
        self.token = token
        self.chat_ids = chat_ids

    def _format_item(self, item: dict) -> str:
        title = html.escape(item.get("title", "").strip())
        link = item.get("link", "")
        source = html.escape(item.get("source", "") or "")
        cat = item.get("category", "other")
        emoji = CATEGORY_EMOJI.get(cat, "📄")
        return f'{emoji} <a href="{link}">{title}</a>\n   <i>{source}</i>'

    def _send(self, text: str, cid: str) -> bool:
        url = TELEGRAM_API.format(token=self.token)
        try:
            resp = requests.post(url, json={
                "chat_id": cid,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            }, timeout=TIMEOUT)
            if not resp.ok:
                print(f"Telegram HTTP {resp.status_code} para {cid}: {resp.text}", file=sys.stderr)
                return False
            return True
        except requests.RequestException as e:
            print(f"Telegram request error para {cid}: {e}", file=sys.stderr)
            return False

    def send_batch(self, items: List[dict]) -> bool:
        all_ok = True
        total = len(items)
        for i in range(0, total, MAX_PER_MESSAGE):
            chunk = items[i:i + MAX_PER_MESSAGE]
            header = (f"🏛️ <b>Alertas normativa LA — Real Estate</b>\n"
                      f"<i>{len(chunk)} novedades</i>\n\n")
            body = "\n\n".join(self._format_item(it) for it in chunk)
            
            for cid in self.chat_ids:
                if not self._send(header + body, cid):
                    all_ok = False
        return all_ok
