/* Rolladen Glass Card - Home Assistant Lovelace custom card
 * No external dependencies. HACS-compatible.
 */
const CARD_VERSION = "1.0.0";
const DEFAULTS = {
  name: "WC Rolladen",
  travel_time: 20,
  show_clouds: true,
  show_stars: true,
  show_landscape: true,
  show_slits: true,
  show_position: true,
  position_mode: "below",
  long_words: false,
  label_pill: true,
  sun_entity: "sun.sun",
  col_open: "#34c759",
  col_move: "#ff9f0a",
  col_closed: "#98a2b3"
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

class RolladenGlassCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._timer = null;
    this._started = 0;
    this._lastState = "";
    this._lastPosition = null;
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Bitte eine Cover-Entität angeben (entity: cover.xyz).");
    this._config = { ...DEFAULTS, ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 3; }

  static getConfigElement() { return document.createElement("rolladen-glass-card-editor"); }
  static getStubConfig() { return { entity: "cover.example", name: "Rolladen" }; }

  _render() {
    if (!this._hass || !this._config.entity) return;
    const cfg = this._config;
    const entity = this._hass.states[cfg.entity];
    if (!entity) {
      this.shadowRoot.innerHTML = `<ha-card><div class="error">Entität nicht gefunden: ${esc(cfg.entity)}</div></ha-card>`;
      return;
    }

    const state = entity.state;
    const raw = entity.attributes.current_position;
    const hasPosition = raw !== undefined && raw !== null && !Number.isNaN(Number(raw));
    const position = hasPosition ? clamp(Number(raw), 0, 100) : (state === "closed" ? 0 : 100);
    const moving = state === "opening" || state === "closing";
    if (state !== this._lastState || (hasPosition && position !== this._lastPosition)) {
      this._started = Date.now();
      this._lastState = state;
      this._lastPosition = position;
    }
    const words = cfg.long_words
      ? { open:"Offen", closed:"Geschlossen", opening:"Öffnet …", closing:"Schließt …" }
      : { open:"Offen", closed:"Zu", opening:"Öffnet", closing:"Schließt" };
    const status = words[state] || state;
    const accent = state === "closed" ? cfg.col_closed : (moving ? cfg.col_move : cfg.col_open);
    const positionText = hasPosition && cfg.show_position
      ? (cfg.position_mode === "inline" ? ` · ${position} %` : `<div class="pct">${position} %</div>`)
      : "";
    const pill = cfg.label_pill
      ? "padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(14px);"
      : "";
    const sun = this._hass.states[cfg.sun_entity];
    let elevation = sun ? Number(sun.attributes.elevation) : 20;
    if (!Number.isFinite(elevation)) elevation = 20;
    const rising = !!(sun && sun.attributes.rising);
    const day = clamp((elevation + 4) / 14, 0, 1);
    const skyStops = [
      [-12, "#050a1c", "#16224a"], [-5, "#1f2a5c", "#6a4a7c"],
      [0, "#4b5fa8", "#f08a5d"], [6, "#5b94d6", "#ffcf9a"],
      [18, "#3f9be8", "#bfe4ff"]
    ];
    const mix = (a,b,t) => {
      const x = a.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
      const y = b.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
      return "#" + x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0")).join("");
    };
    let sky = skyStops[skyStops.length-1];
    if (elevation <= skyStops[0][0]) sky = skyStops[0];
    else {
      for (let i=1;i<skyStops.length;i++) if (elevation <= skyStops[i][0]) {
        const a=skyStops[i-1], b=skyStops[i], t=(elevation-a[0])/(b[0]-a[0]);
        sky=[elevation,mix(a[1],b[1],t),mix(a[2],b[2],t)]; break;
      }
    }
    const h = 0.84 * (100-position);
    const elapsed = moving ? Math.min(1, (Date.now()-this._started)/(Math.max(1,Number(cfg.travel_time)||20)*1000)) : 1;
    const visualH = moving
      ? (state === "opening" ? h*(1-elapsed) : h+(84-h)*elapsed)
      : h;
    const stars = cfg.show_stars ? `<g opacity="${clamp((-4-elevation)/8,0,1)}">${[[36,36],[44,50],[52,38],[66,42],[84,36],[80,54],[40,62],[70,60],[56,56],[86,66]].map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i%3===0?.9:.6}" fill="white"><animate attributeName="opacity" values="1;.25;1" dur="${2+(i%4)*.7}s" begin="${i*.3}s" repeatCount="indefinite"/></circle>`).join("")}</g>` : "";
    const cloud = (x,y,scale,duration,dx) => `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} 0;0 0" dur="${duration}s" repeatCount="indefinite"/><g transform="translate(${x} ${y}) scale(${scale})" fill="${mix("#4a5578","#ffffff",day)}" opacity="${.35+.55*day}"><ellipse rx="9" ry="3.4"/><ellipse cx="-4.5" cy="-2" rx="5" ry="3"/><ellipse cx="3" cy="-3" rx="6" ry="3.6"/></g></g>`;
    const clouds = cfg.show_clouds ? cloud(45,44,1,40,10)+cloud(80,58,.75,55,-12) : "";
    const landscape = cfg.show_landscape ? `
      <path d="M30 84 Q42 74 54 80 T80 78 T90 76 L90 101 L30 101Z" fill="${mix("#1a2548","#8db4c6",day)}"/>
      <rect x="64" y="73" width="12" height="9" fill="${mix("#1a2030","#e8d9c0",day)}"/>
      <polygon points="62,73 70,66.5 78,73" fill="${mix("#10131c","#a5533a",day)}"/>
      <rect x="67.5" y="75.5" width="3" height="3" fill="${mix("#ffd166","#9ec9e0",day)}"/>
      <path d="M30 94 Q46 86 62 92 T90 90 L90 101 L30 101Z" fill="${mix("#0b1322","#4f8a45",day)}"/>
      <rect x="38" y="87" width="1.6" height="6" fill="#4a3a2a"/><ellipse cx="38.8" cy="84.5" rx="4.5" ry="6" fill="${mix("#0a1a14","#2f6f36",day)}"/>
    ` : "";
    const slits = cfg.show_slits ? Array.from({length:9},(_,i)=>`<rect x="${5+i*7}" y="1.9" width="3.6" height="1" rx=".5" fill="#3b4660" opacity=".35"/>`).join("") : "";
    const slatPattern = `<pattern id="slats" x="26" y="108" width="68" height="5" patternUnits="userSpaceOnUse"><rect width="68" height="5" fill="#d5deeb"/><rect width="68" height="5" fill="${sky[2]}" opacity=".14"/>${slits}<rect width="68" height=".8" fill="#fff" opacity=".6"/><rect y="4.7" width="68" height=".3" fill="#000" opacity=".25"/></pattern>`;
    const sunVisible = elevation > -4;
    const sunX = rising ? 42 : 78;
    const sunY = 82-clamp(elevation,-4,50)*.85;
    const moonOpacity = clamp((3-elevation)/10,0,1);
    const background = `linear-gradient(145deg,rgba(255,255,255,${(.1+.14*day).toFixed(2)}),rgba(${Math.round(70+90*day)},${Math.round(90+110*day)},${Math.round(160+80*day)},.12))`;

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}
        ha-card{position:relative;overflow:hidden;border-radius:26px;padding:10px;font-family:-apple-system,"SF Pro Display","SF Pro Text",system-ui,sans-serif;color:var(--primary-text-color);border:1px solid rgba(255,255,255,.26);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);box-shadow:0 12px 36px rgba(0,0,0,.22),inset 0 1px 1px rgba(255,255,255,.6),inset 0 -1px 1px rgba(255,255,255,.12),inset 0 0 28px rgba(255,255,255,.05);background:${background};cursor:pointer;transition:transform .3s,box-shadow .3s}
        ha-card:active{transform:scale(.97)}
        ha-card:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(120% 55% at 18% 0%,rgba(255,255,255,.38),transparent 60%)}
        ha-card:after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(315deg,rgba(255,255,255,.14),transparent 38%)}
        .layout{display:grid;grid-template-columns:68px minmax(0,1fr);grid-template-areas:"svg n" "svg l";grid-template-rows:auto auto;column-gap:10px;row-gap:3px;align-items:center;align-content:center}
        .art{grid-area:svg;width:68px;justify-self:start}.art svg{width:100%;display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}
        .name{grid-area:n;font-weight:600;font-size:12.5px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.92}
        .label{grid-area:l;font-size:10.5px;font-weight:500;min-width:0}
        .status{display:inline-flex;align-items:center;max-width:100%;box-sizing:border-box;white-space:nowrap;${pill}}
        .dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;flex:none;background:${accent};box-shadow:0 0 8px ${accent};${moving?"animation:pulse 1s ease-in-out infinite;":""}}
        .pct{margin:5px 0 0 3px;font-size:11px;font-weight:600;opacity:.7}
        @keyframes pulse{50%{opacity:.3}}
        .error{padding:16px;color:var(--error-color)}
      </style>
      <ha-card tabindex="0" role="button" aria-label="${esc(cfg.name)}: ${esc(status)}">
        <div class="layout">
          <div class="art">
            <svg viewBox="12 4 96 116" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
                <linearGradient id="slat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset=".55" stop-color="#c8d1e0" stop-opacity=".8"/><stop offset="1" stop-color="#7f8ca6" stop-opacity=".88"/></linearGradient>
                <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".5" stop-color="#e6efff" stop-opacity=".38"/><stop offset="1" stop-color="#bcd0f5" stop-opacity=".26"/></linearGradient>
                <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>
                <clipPath id="glassClip"><rect x="30" y="30" width="28.5" height="71" rx="6.5"/><rect x="61.5" y="30" width="28.5" height="71" rx="6.5"/></clipPath>
                <clipPath id="shaft"><path d="M26 24 H94 V99 Q94 108 85 108 H35 Q26 108 26 99 Z"/></clipPath>
                ${slatPattern}
              </defs>
              <rect x="27" y="27" width="66" height="78" rx="9" fill="#fff" fill-opacity=".14" stroke="url(#rim)"/>
              <g clip-path="url(#glassClip)">
                <rect x="30" y="30" width="60" height="71" fill="url(#sky)"/>
                ${stars}
                ${sunVisible?`<circle cx="${sunX}" cy="${sunY}" r="16" fill="${mix("#ff7a3a","#ffe15a",clamp(elevation/14,0,1))}" opacity=".2"/><circle cx="${sunX}" cy="${sunY}" r="6.5" fill="${mix("#ff7a3a","#ffe15a",clamp(elevation/14,0,1))}"/>`:""}
                <g opacity="${moonOpacity}"><circle cx="74" cy="46" r="6.2" fill="#f4f1d2"/></g>
                ${clouds}${landscape}
                <polygon points="62,30 78,30 40,101 24,101" fill="#fff" opacity=".16"/>
              </g>
              <rect x="30" y="30" width="28.5" height="71" rx="6.5" fill="none" stroke="url(#rim)" stroke-width=".7"/>
              <rect x="61.5" y="30" width="28.5" height="71" rx="6.5" fill="none" stroke="url(#rim)" stroke-width=".7"/>
              <ellipse cx="60" cy="116.5" rx="38" ry="2.4" fill="#000" opacity=".12"/>
              <rect x="20" y="108" width="80" height="6" rx="3" fill="url(#glass)" stroke="url(#rim)" stroke-width=".8"/>
              <g clip-path="url(#shaft)">
                <g transform="translate(0 ${-(84-visualH)})">
                  <rect x="26" y="-60" width="68" height="168" fill="url(#slats)"/>
                  <rect x="26" y="103.5" width="68" height="4.5" fill="url(#glass)"/>
                </g>
                ${moving?`<circle cx="60" cy="66" r="15" fill="#000" fill-opacity=".22" stroke="#fff" stroke-opacity=".4"/><path d="M51 ${state==="opening"?71:61} L60 ${state==="opening"?62:70} L69 ${state==="opening"?71:61}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite"/></path>`:""}
              </g>
              <rect x="18" y="8" width="84" height="16" rx="8" fill="url(#glass)" stroke="url(#rim)" stroke-width=".8"/>
              <rect x="27" y="10" width="66" height="1.2" rx=".6" fill="#fff" opacity=".55"/>
              <circle cx="91" cy="16" r="5" fill="${accent}" opacity=".3"/><circle cx="91" cy="16" r="2.1" fill="${accent}"/>
            </svg>
          </div>
          <div class="name">${esc(cfg.name || cfg.entity)}</div>
          <div class="label"><span class="status"><span class="dot"></span>${esc(status)}${hasPosition && cfg.show_position && cfg.position_mode==="inline" ? ` · ${position} %` : ""}</span>${positionText && cfg.position_mode==="below" ? positionText : ""}</div>
        </div>
      </ha-card>`;
    const card = this.shadowRoot.querySelector("ha-card");
    let holdTimer = null;
    let held = false;
    card.addEventListener("pointerdown", () => {
      held = false;
      holdTimer = setTimeout(() => { held = true; this._moreInfo(); }, 550);
    });
    const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null; };
    card.addEventListener("pointerup", cancelHold);
    card.addEventListener("pointerleave", cancelHold);
    card.addEventListener("pointercancel", cancelHold);
    card.addEventListener("click", e => { if (held) { e.preventDefault(); e.stopPropagation(); held = false; return; } this._toggle(); });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._toggle(); } });
    card.addEventListener("contextmenu", e => { e.preventDefault(); this._moreInfo(); });
    if (moving) {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._render(), 250);
    } else clearTimeout(this._timer);
  }

  _toggle() {
    const state = this._hass?.states[this._config.entity]?.state;
    const service = state === "open" || state === "opening" ? "close_cover" : "open_cover";
    this._hass.callService("cover", service, { entity_id: this._config.entity });
  }

  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId: this._config.entity }
    }));
  }
}

class RolladenGlassCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); this._config = {}; }
  setConfig(config) { this._config = {...config}; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _value(key, fallback) { return this._config[key] ?? fallback; }
  _render() {
    if (!this._hass) return;
    const cfg = this._config;
    const entities = Object.keys(this._hass.states).filter(k=>k.startsWith("cover.")).map(k=>({value:k,label:`${this._hass.states[k].attributes.friendly_name || k} (${k})`}));
    const schema = [
      {name:"entity",label:"Rollladen-Entität",selector:{entity:{domain:"cover"}}},
      {name:"name",label:"Anzeigename",selector:{text:{}}},
      {name:"sun_entity",label:"Sonnen-Entität",selector:{entity:{domain:"sun"}}},
      {name:"travel_time",label:"Fahrzeit für eine komplette Fahrt (Sekunden)",selector:{number:{min:1,max:180,step:1,mode:"box"}}},
      {name:"position_mode",label:"Positionsanzeige",selector:{select:{options:[{label:"Darunter",value:"below"},{label:"Inline",value:"inline"},{label:"Aus",value:"off"}]}}},
      {name:"long_words",label:"Ausführliche Statusbegriffe",selector:{boolean:{}}},
      {name:"label_pill",label:"Status als Glas-Pill anzeigen",selector:{boolean:{}}},
      {name:"show_position",label:"Position anzeigen",selector:{boolean:{}}},
      {name:"show_clouds",label:"Wolken anzeigen",selector:{boolean:{}}},
      {name:"show_stars",label:"Sterne anzeigen",selector:{boolean:{}}},
      {name:"show_landscape",label:"Landschaft anzeigen",selector:{boolean:{}}},
      {name:"show_slits",label:"Lüftungsschlitze anzeigen",selector:{boolean:{}}},
      {name:"col_open",label:"Farbe: Offen",selector:{text:{}}},
      {name:"col_move",label:"Farbe: Bewegung",selector:{text:{}}},
      {name:"col_closed",label:"Farbe: Geschlossen",selector:{text:{}}}
    ];
    this.shadowRoot.innerHTML = `<style>:host{display:block}ha-form{display:block}</style><ha-form></ha-form>`;
    const form = this.shadowRoot.querySelector("ha-form");
    form.data = {
      entity:cfg.entity || "", name:this._value("name",DEFAULTS.name),
      sun_entity:this._value("sun_entity",DEFAULTS.sun_entity),
      travel_time:this._value("travel_time",DEFAULTS.travel_time),
      position_mode:this._value("position_mode",DEFAULTS.position_mode),
      long_words:this._value("long_words",DEFAULTS.long_words),
      label_pill:this._value("label_pill",DEFAULTS.label_pill),
      show_position:this._value("show_position",DEFAULTS.show_position),
      show_clouds:this._value("show_clouds",DEFAULTS.show_clouds),
      show_stars:this._value("show_stars",DEFAULTS.show_stars),
      show_landscape:this._value("show_landscape",DEFAULTS.show_landscape),
      show_slits:this._value("show_slits",DEFAULTS.show_slits),
      col_open:this._value("col_open",DEFAULTS.col_open),
      col_move:this._value("col_move",DEFAULTS.col_move),
      col_closed:this._value("col_closed",DEFAULTS.col_closed)
    };
    form.schema = schema;
    form.computeLabel = (s) => s.label || s.name;
    form.addEventListener("value-changed", e => {
      e.stopPropagation();
      this._config = {...this._config, ...e.detail.value};
      this.dispatchEvent(new CustomEvent("config-changed",{bubbles:true,composed:true,detail:{config:this._config}}));
    });
  }
}

if (!customElements.get("rolladen-glass-card")) customElements.define("rolladen-glass-card", RolladenGlassCard);
if (!customElements.get("rolladen-glass-card-editor")) customElements.define("rolladen-glass-card-editor", RolladenGlassCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "rolladen-glass-card",
  name: "Rolladen Glass Card",
  description: "Animierte Rollladenkarte mit Glassmorphism und dynamischer Tag-/Nacht-Szene.",
  preview: true
});
console.info(`%c ROLLADEN-GLASS-CARD %c ${CARD_VERSION} `,"color:white;background:#5865f2;font-weight:bold;","color:#5865f2;font-weight:bold;");
