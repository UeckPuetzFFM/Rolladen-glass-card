# Rolladen Glass Card

Eine eigenständige Lovelace-Custom-Card für Home Assistant, basierend auf der bereitgestellten `custom:button-card`-Gestaltung.

## Funktionen

- Dynamische Tag-/Nachtszene anhand von `sun.sun`
- Animierte Sterne und Wolken
- Landschaft im Hintergrund
- Glassmorphism-Design
- Statusanzeige mit konfigurierbaren Farben
- Positionsanzeige inline, darunter oder deaktiviert
- Tippen: Rollladen öffnen/schließen
- Gedrückthalten (ca. 550 ms) bzw. Rechtsklick/Kontextmenü: More-Info
- Visueller Konfigurationseditor und YAML-Konfiguration

## Installation über HACS

1. Dieses Repository in ein eigenes GitHub-Repository hochladen.
2. In Home Assistant **HACS → ⋮ → Benutzerdefinierte Repositories** öffnen.
3. Repository-URL eintragen und als Kategorie **Dashboard** wählen.
4. Die **Rolladen Glass Card** installieren.
5. Home Assistant bzw. den Browser neu laden.

HACS erwartet die Datei unter `rolladen-glass-card.js` im Verzeichnis `www` des Repositories. In den Repository-Einstellungen kann bei Bedarf der Inhalt des Repositories als Download-Quelle verwendet werden.

## YAML-Beispiel

```yaml
type: custom:rolladen-glass-card
entity: cover.rolladen_wc_shelly_cover_0
name: WC Rolladen
sun_entity: sun.sun
travel_time: 20
show_clouds: true
show_stars: true
show_landscape: true
show_slits: true
show_position: true
position_mode: below # below | inline | off
long_words: false
label_pill: true
col_open: "#34c759"
col_move: "#ff9f0a"
col_closed: "#98a2b3"
```

## Optionen

| Option | Standard | Bedeutung |
|---|---:|---|
| `entity` | erforderlich | Cover-Entität |
| `name` | WC Rolladen | Angezeigter Name |
| `sun_entity` | `sun.sun` | Sonnen-Entität für die Szene |
| `travel_time` | `20` | Geschätzte vollständige Fahrzeit in Sekunden |
| `show_clouds` | `true` | Wolken |
| `show_stars` | `true` | Sterne bei Nacht |
| `show_landscape` | `true` | Landschaft |
| `show_slits` | `true` | Lamellen-/Lüftungsschlitze |
| `show_position` | `true` | Positionswert anzeigen |
| `position_mode` | `below` | `below`, `inline` oder `off` |
| `long_words` | `false` | Ausführliche Statuswörter |
| `label_pill` | `true` | Glas-Pill um den Status |
| `col_open` | `#34c759` | Statusfarbe offen |
| `col_move` | `#ff9f0a` | Statusfarbe in Bewegung |
| `col_closed` | `#98a2b3` | Statusfarbe geschlossen |

## Hinweise

- Die Karte nutzt den Standarddienst `cover.open_cover` bzw. `cover.close_cover`.
- Ein kurzer Klick toggelt anhand des aktuellen Zustands zwischen Öffnen und Schließen.
- Gedrückthalten (ca. 550 ms) sowie Kontextmenü/Rechtsklick öffnen More-Info.
- Die Animation während der Fahrt ist eine visuelle Schätzung. Für eine exakte Darstellung sollte der Shelly regelmäßig `current_position` aktualisieren.
- Die HACS-Veröffentlichung setzt ein GitHub-Repository voraus. Dieses Paket ist der Quellstand, noch nicht automatisch in HACS veröffentlicht.
