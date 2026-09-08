"""Entrada principal: obtiene noticias regulatorias de LA y envía alertas nuevas por Telegram.

También genera app/data/alerts.json para alimentar la PWA dashboard.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Permite importar módulos hermanos
sys.path.insert(0, str(Path(__file__).parent))

from sources import fetch_all
from filter import is_relevant
from notifier import TelegramNotifier
from categorizer import categorize_batch
from state import State

DATA_DIR = Path(__file__).parent.parent / "data"
STATE_FILE = DATA_DIR / "seen.json"
APP_DATA_DIR = Path(__file__).parent.parent / "app" / "data"
ALERTS_JSON = APP_DATA_DIR / "alerts.json"
MAX_ALERTS_HISTORY = 500


def _load_alerts_history() -> list[dict]:
    """Carga el historial de alertas existente."""
    if not ALERTS_JSON.exists():
        return []
    try:
        with open(ALERTS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("alerts", [])
    except (json.JSONDecodeError, OSError):
        return []


def _save_alerts_history(alerts: list[dict]) -> None:
    """Guarda el historial de alertas como JSON para la PWA."""
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Deduplicar por id y limitar a MAX_ALERTS_HISTORY
    seen_ids: set[str] = set()
    unique: list[dict] = []
    for alert in alerts:
        if alert["id"] not in seen_ids:
            seen_ids.add(alert["id"])
            unique.append(alert)
    # Ordenar por fecha descendente y recortar
    unique.sort(key=lambda a: a.get("published", ""), reverse=True)
    unique = unique[:MAX_ALERTS_HISTORY]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(unique),
        "alerts": unique,
    }
    with open(ALERTS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"alerts.json actualizado: {len(unique)} alertas.")


def main() -> int:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("ERROR: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID", file=sys.stderr)
        return 1

    state = State(STATE_FILE)
    was_empty = len(state) == 0
    print(f"Estado cargado: {len(state)} items vistos previamente.")

    items = fetch_all()
    print(f"Fuentes consultadas. {len(items)} items obtenidos.")

    new_all_ids = []
    new_relevant = []
    for item in items:
        if state.has(item["id"]):
            continue
        new_all_ids.append(item["id"])
        if is_relevant(item):
            new_relevant.append(item)

    # Categorizar todas las alertas relevantes nuevas
    categorize_batch(new_relevant)

    print(f"Nuevos: {len(new_all_ids)} | Relevantes: {len(new_relevant)}")

    if was_empty:
        # Primera corrida: sembrar estado sin inundar con alertas históricas.
        print("Primera ejecución: sembrando estado sin enviar alertas.")
        for iid in new_all_ids:
            state.add(iid)
        state.save()
        # Aún así guardamos las alertas en el historial para la app
        history = _load_alerts_history()
        history.extend(new_relevant)
        _save_alerts_history(history)
        return 0

    if new_relevant:
        notifier = TelegramNotifier(token=token, chat_id=chat_id)
        ok = notifier.send_batch(new_relevant)
        if not ok:
            print("Envío falló. No se marca como visto para reintentar la próxima hora.",
                  file=sys.stderr)
            # Guardamos solo los no-relevantes como vistos igualmente
            relevant_ids = {i["id"] for i in new_relevant}
            for iid in new_all_ids:
                if iid not in relevant_ids:
                    state.add(iid)
            state.save()
            return 2

    # Marcar todo lo nuevo como visto
    for iid in new_all_ids:
        state.add(iid)
    state.save()

    # Actualizar historial de alertas para la PWA
    if new_relevant:
        history = _load_alerts_history()
        history.extend(new_relevant)
        _save_alerts_history(history)

    print("Listo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
