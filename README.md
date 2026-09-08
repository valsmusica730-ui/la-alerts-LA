# LA Real Estate Regulatory Monitor

Bot que corre en GitHub Actions cada hora y te avisa por **Telegram** cuando aparecen novedades regulatorias que afectan bienes raíces en Los Ángeles (California, EE.UU.): cambios de zonificación, control de rentas, ordenanzas, medidas del City Council, Measure ULA, ADU, moratorias, códigos de construcción (LADBS), etc.

- **Costo:** $0. GitHub Actions es gratis en repos públicos y da 2.000 minutos/mes en privados (esto usa ~30 min/mes).
- **Privado:** las alertas llegan solo a tu chat con el bot en Telegram.
- **Sin servidores:** todo corre en GitHub.

---

## 1. Crear el bot de Telegram (5 min)

1. Abre Telegram y busca **@BotFather**.
2. Envía `/newbot` y sigue las instrucciones (nombre y username, el username debe terminar en `bot`).
3. BotFather te dará un **token** parecido a `1234567890:AAE...xyz`. Cópialo.
4. Ahora busca **@userinfobot** en Telegram, ábrelo y envía cualquier mensaje. Te va a devolver tu **Chat ID** (un número entero, ej. `987654321`).
5. **Importante:** abre tu bot recién creado (con el username que le pusiste) y envíale un `/start`. Si no, no te podrá escribir.

## 2. Crear el repositorio

1. En GitHub, crea un repo nuevo (puede ser **privado**).
2. Sube todos los archivos de esta carpeta al repo (arrastra y suelta en la interfaz web, o con `git`).
3. En **Settings → Secrets and variables → Actions → New repository secret**, agrega estos dos secretos:
   - `TELEGRAM_BOT_TOKEN` → el token del paso 1.3
   - `TELEGRAM_CHAT_ID` → tu chat ID del paso 1.4

## 3. Activar y probar

1. Ve a la pestaña **Actions** del repo. Si aparece un botón para habilitar workflows, dale.
2. Selecciona el workflow **LA Real Estate Regulatory Monitor** en la barra lateral.
3. Haz clic en **Run workflow → Run workflow** para forzar una corrida ahora (no esperes la hora).
4. La **primera corrida no envía alertas** — sirve solo para inicializar el estado (evita inundarte con noticias viejas). A partir de la segunda hora empiezas a recibir solo lo nuevo.

Listo. A partir de acá te va a llegar un mensaje cada vez que haya novedades.

---

## Cómo personalizar

### Cambiar la frecuencia
En `.github/workflows/monitor.yml`, edita el `cron`:
```yaml
- cron: '0 * * * *'      # cada hora
- cron: '0 */3 * * *'    # cada 3 horas
- cron: '0 8,14,20 * * *'  # 3 veces al día (UTC)
```
GitHub Actions no garantiza puntualidad exacta al minuto; puede tardar unos minutos extra en horarios pico.

### Añadir/quitar temas de búsqueda
Edita la lista `QUERIES` en `src/sources.py`. Cada línea es una búsqueda de Google News. Usa comillas para frases exactas y `OR` para alternativas. Ejemplos que puedes agregar:
```python
'"Beverly Hills" (zoning OR ordinance)',
'"Santa Monica" ("rent control" OR eviction)',
'"West Hollywood" "short-term rental"',
```

### Afinar el filtro
En `src/filter.py`:
- Agrega palabras a `REGULATORY_KEYWORDS` si notas que se te escapan noticias importantes.
- Agrega palabras a `NOISE_PENALIZERS` si te llegan noticias irrelevantes que quieres descartar.

### Ver logs
En la pestaña **Actions**, entra a cualquier ejecución y mira el paso **Run monitor** para ver qué queries corrieron, cuántos items encontró y cuántos eran relevantes.

---

## Estructura

```
.
├── .github/workflows/monitor.yml   # scheduler + orquestación
├── src/
│   ├── monitor.py                  # entry point
│   ├── sources.py                  # queries + fetch de Google News RSS
│   ├── filter.py                   # filtro de relevancia
│   ├── notifier.py                 # envío a Telegram
│   └── state.py                    # dedup persistente
├── data/seen.json                  # se crea solo, se commitea automáticamente
├── requirements.txt
├── .gitignore
└── README.md
```

## Limitaciones honestas

- **Cobertura:** el monitor se apoya principalmente en Google News, que indexa medios grandes. Cambios muy locales (agendas de un comité específico del City Council) pueden no aparecer inmediatamente. Si quieres cobertura oficial más profunda, se pueden agregar scrapers para `cityclerk.lacity.org`, `planning.lacity.gov`, `housing.lacity.gov` y `ladbs.org`.
- **Latencia:** GitHub Actions puede demorar unos minutos en disparar cron jobs en horas pico. Para alertas real-time hay que pagar infraestructura dedicada.
- **Falsos positivos/negativos:** el filtro por palabras clave no es perfecto. Ajusta `filter.py` con el uso.
- **Idioma:** las queries están en inglés porque la prensa y los reguladores publican en inglés. Las alertas te llegan con el título original en inglés (podemos agregar traducción automática si quieres).

## Extensiones posibles

- Añadir scrapers de sitios oficiales de LA (City Clerk, Planning, LAHD, LADBS).
- Traducir titulares al español automáticamente antes de enviar.
- Clasificar alertas por prioridad (alta/media/baja) con reglas o con un LLM.
- Enviar un resumen diario en vez de alerta por alerta.
- Filtrar por barrios específicos donde tienes propiedades.

Si quieres cualquiera de estas, pídemelo y te lo agrego.
