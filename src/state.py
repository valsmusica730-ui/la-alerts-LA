"""Persistencia del estado: qué items ya fueron notificados.

El archivo se guarda en data/seen.json y se commitea al repo por el workflow,
así que entre corridas de GitHub Actions no se duplican alertas.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

RETENTION_DAYS = 90  # elimina IDs con más de 90 días para no crecer sin límite


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class State:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.data: dict[str, str] = self._load()

    def _load(self) -> dict[str, str]:
        if not self.path.exists():
            return {}
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    return loaded
                return {}
        except (json.JSONDecodeError, OSError):
            return {}

    def has(self, item_id: str) -> bool:
        return item_id in self.data

    def add(self, item_id: str) -> None:
        self.data[item_id] = _now_iso()

    def _prune(self) -> None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
        keep = {}
        for k, v in self.data.items():
            try:
                ts = datetime.fromisoformat(v)
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if ts > cutoff:
                    keep[k] = v
            except ValueError:
                # timestamp inválido, lo dejamos por si acaso
                keep[k] = v
        self.data = keep

    def save(self) -> None:
        self._prune()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, sort_keys=True)

    def __len__(self) -> int:
        return len(self.data)
