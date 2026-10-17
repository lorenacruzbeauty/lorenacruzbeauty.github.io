/*!
 * Fox & Co. Digital — botón de soporte para el panel del dueño.
 * Se carga en admin.html. Crea un pedido en la base del cliente (tabla "soporte")
 * y aparece automáticamente en el panel de Fox & Co. Clientes.
 *
 * Uso (después de crear el cliente de Supabase en admin.html):
 *   <script src="soporte-fox.js"></script>
 *   <script>
 *     FoxSoporte.init(sb, { whatsapp: '549XXXXXXXXXX', accent: '#c9a24b' });
 *   </script>
 * donde "sb" es la variable que ya usa tu admin.html para hablar con Supabase.
 *
 * Requiere haber corrido el módulo SQL de soporte (funciones soporte_crear y soporte_mis_tickets).
 * El botón solo se muestra cuando el dueño tiene la sesión iniciada.
 */
(function (w) {
  'use strict';

  var TIPOS = [
    ['consulta', 'Tengo una consulta'],
    ['error', 'Algo no funciona'],
    ['cambio', 'Quiero un cambio en mi página'],
    ['otro', 'Otro tema']
  ];
  var ESTADOS = { nuevo: 'Recibido', en_curso: 'En curso', resuelto: 'Resuelto' };
  var ERRORES = {
    no_autorizado: 'Tu sesión no tiene permiso para pedir soporte. Volvé a iniciar sesión.',
    mensaje_invalido: 'Contanos un poco más: el mensaje tiene que tener entre 5 y 1000 letras.',
    demasiados: 'Mandaste varios pedidos seguidos. Esperá un rato y probá de nuevo.'
  };

  var state = { client: null, opts: {}, host: null, root: null, open: false, logged: false, tab: 'nuevo', busy: false, msg: '', msgKind: '', tickets: null, lastId: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fecha(iso) {
    try {
      return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch (e) { return ''; }
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:var(--fx-font,system-ui,-apple-system,"Segoe UI",sans-serif)}',
    '.fab{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:2147483000;',
    'border:0;border-radius:999px;padding:12px 18px;font-size:15px;font-weight:600;cursor:pointer;',
    'background:var(--fx-accent);color:var(--fx-on-accent);box-shadow:0 6px 20px rgba(0,0,0,.35)}',
    '.fab:focus-visible,.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.tab:focus-visible{outline:2px solid var(--fx-accent);outline-offset:2px}',
    '.ov{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px}',
    '@media(min-width:560px){.ov{align-items:center}}',
    '.card{width:100%;max-width:460px;max-height:92vh;overflow:auto;background:var(--fx-bg);color:var(--fx-fg);border:1px solid var(--fx-line);border-radius:16px;padding:18px}',
    'h2{margin:0 0 4px;font-size:20px}',
    '.sub{margin:0 0 14px;font-size:14px;opacity:.75}',
    '.tabs{display:flex;gap:6px;margin-bottom:14px}',
    '.tab{flex:1;border:1px solid var(--fx-line);background:transparent;color:inherit;border-radius:10px;padding:8px;font-size:14px;cursor:pointer}',
    '.tab[aria-selected=true]{background:var(--fx-accent);color:var(--fx-on-accent);border-color:transparent;font-weight:600}',
    'label{display:block;font-size:13px;margin:10px 0 4px;opacity:.85}',
    'input[type=text],select,textarea{width:100%;font-size:16px;padding:10px;border-radius:10px;border:1px solid var(--fx-line);background:var(--fx-field);color:inherit}',
    'textarea{min-height:110px;resize:vertical}',
    '.chk{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:14px}',
    '.chk input{width:18px;height:18px;accent-color:var(--fx-accent)}',
    '.row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}',
    '.btn{border:1px solid var(--fx-line);background:transparent;color:inherit;border-radius:10px;padding:10px 16px;font-size:15px;cursor:pointer;text-decoration:none;display:inline-block}',
    '.btn.main{background:var(--fx-accent);color:var(--fx-on-accent);border-color:transparent;font-weight:600}',
    '.btn[disabled]{opacity:.6;cursor:default}',
    '.note{margin:12px 0 0;padding:10px 12px;border-radius:10px;font-size:14px}',
    '.note.ok{background:rgba(60,170,100,.18)}',
    '.note.err{background:rgba(220,80,70,.2)}',
    '.tk{border:1px solid var(--fx-line);border-radius:12px;padding:10px 12px;margin-bottom:10px}',
    '.tk .h{display:flex;justify-content:space-between;gap:8px;font-size:12px;opacity:.8;margin-bottom:6px}',
    '.tk p{margin:0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.tk .re{margin-top:8px;padding-top:8px;border-top:1px dashed var(--fx-line);font-size:14px}',
    '.pill{border-radius:999px;padding:1px 9px;font-size:12px;border:1px solid var(--fx-line)}',
    '.pill.resuelto{background:rgba(60,170,100,.2);border-color:transparent}',
    '.pill.en_curso{background:rgba(230,180,60,.22);border-color:transparent}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
  ].join('');

  function ensureHost() {
    if (state.host) return;
    var h = document.createElement('div');
    h.id = 'fox-soporte';
    var o = state.opts;
    h.style.setProperty('--fx-accent', o.accent || '#c9a24b');
    h.style.setProperty('--fx-on-accent', o.onAccent || '#1a1408');
    h.style.setProperty('--fx-bg', o.bg || '#16130d');
    h.style.setProperty('--fx-fg', o.fg || '#f3ead8');
    h.style.setProperty('--fx-line', o.line || 'rgba(255,255,255,.18)');
    h.style.setProperty('--fx-field', o.field || 'rgba(255,255,255,.06)');
    if (o.font) h.style.setProperty('--fx-font', o.font);
    var root = h.attachShadow({ mode: 'open' });
    var st = document.createElement('style');
    st.textContent = CSS;
    root.appendChild(st);
    var box = document.createElement('div');
    root.appendChild(box);
    state.box = box;
    state.root = root;
    state.host = h;
    document.body.appendChild(h);
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { close(); } });
  }

  function draw() {
    if (!state.host) return;
    if (!state.logged) { state.box.innerHTML = ''; return; }
    var html = '<button class="fab" data-a="open" aria-haspopup="dialog">' + esc(state.opts.label || 'Pedir soporte') + '</button>';
    if (state.open) {
      html += '<div class="ov" data-a="ov"><div class="card" role="dialog" aria-modal="true" aria-labelledby="fx-t">' +
        '<h2 id="fx-t">Soporte</h2><p class="sub">Contanos qué necesitás y lo vemos lo antes posible.</p>' +
        '<div class="tabs" role="tablist"><button class="tab" role="tab" data-a="tab" data-t="nuevo" aria-selected="' + (state.tab === 'nuevo') + '">Nuevo pedido</button>' +
        '<button class="tab" role="tab" data-a="tab" data-t="mios" aria-selected="' + (state.tab === 'mios') + '">Mis pedidos</button></div>';
      html += state.tab === 'nuevo' ? formHtml() : listHtml();
      html += '</div></div>';
    }
    state.box.innerHTML = html;
    var first = state.box.querySelector(state.tab === 'nuevo' ? 'textarea' : '.tab');
    if (state.open && first && !state.focused) { first.focus(); state.focused = true; }
  }

  function formHtml() {
    var opts = TIPOS.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>'; }).join('');
    var msg = state.msg ? '<div class="note ' + state.msgKind + '" role="status">' + esc(state.msg) + '</div>' : '';
    var wa = '';
    if (state.lastId && state.opts.whatsapp) {
      var txt = 'Hola! Mandé un pedido de soporte (n.º ' + state.lastId + ') desde mi panel.';
      wa = '<div class="row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + String(state.opts.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(txt) + '">Avisar también por WhatsApp</a></div>';
    }
    return '<form data-f="nuevo"><label for="fx-tipo">¿Sobre qué es?</label><select id="fx-tipo" name="tipo">' + opts + '</select>' +
      '<label for="fx-msg">Mensaje</label><textarea id="fx-msg" name="mensaje" maxlength="1000" required placeholder="Contá qué pasó o qué necesitás"></textarea>' +
      '<label for="fx-con">Cómo te contacto (opcional)</label><input id="fx-con" name="contacto" type="text" maxlength="80" placeholder="WhatsApp o email">' +
      '<div class="chk"><input id="fx-urg" name="urgente" type="checkbox"><label for="fx-urg" style="margin:0">Es urgente: los clientes no pueden reservar</label></div>' +
      msg + '<div class="row"><button type="button" class="btn" data-a="close">Cerrar</button><button class="btn main"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Enviando…' : 'Enviar pedido') + '</button></div>' + wa + '</form>';
  }

  function listHtml() {
    var body;
    if (state.tickets === null) body = '<p class="sub">Cargando…</p>';
    else if (state.tickets === false) body = '<div class="note err">No pudimos cargar tus pedidos. Probá de nuevo en un rato.</div>';
    else if (!state.tickets.length) body = '<p class="sub">Todavía no mandaste ningún pedido.</p>';
    else body = state.tickets.map(function (t) {
      return '<div class="tk"><div class="h"><span>' + esc(fecha(t.creado)) + (t.urgencia === 'urgente' ? ' · urgente' : '') + '</span><span class="pill ' + esc(t.estado) + '">' + esc(ESTADOS[t.estado] || t.estado) + '</span></div>' +
        '<p>' + esc(t.mensaje) + '</p>' + (t.respuesta ? '<div class="re"><strong>Respuesta:</strong> ' + esc(t.respuesta) + '</div>' : '') + '</div>';
    }).join('');
    return body + '<div class="row"><button type="button" class="btn" data-a="close">Cerrar</button></div>';
  }

  function loadTickets() {
    state.tickets = null; draw();
    state.client.rpc('soporte_mis_tickets').then(function (r) {
      state.tickets = (r && !r.error && Array.isArray(r.data)) ? r.data : false;
      draw();
    }, function () { state.tickets = false; draw(); });
  }

  function open() { state.open = true; state.focused = false; state.msg = ''; state.lastId = null; draw(); }
  function close() { state.open = false; draw(); var f = state.box && state.box.querySelector('.fab'); if (f) f.focus(); }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!t) return;
    var a = t.getAttribute('data-a');
    if (a === 'open') open();
    else if (a === 'close') close();
    else if (a === 'ov') { if (e.target === t) close(); }
    else if (a === 'tab') { state.tab = t.getAttribute('data-t'); state.focused = false; if (state.tab === 'mios') loadTickets(); else draw(); }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    var f = e.target, d = new FormData(f);
    var mensaje = String(d.get('mensaje') || '').trim();
    if (mensaje.length < 5) { state.msg = ERRORES.mensaje_invalido; state.msgKind = 'err'; draw(); return; }
    state.busy = true; state.msg = ''; draw();
    state.client.rpc('soporte_crear', {
      p_tipo: String(d.get('tipo') || 'consulta'),
      p_urgencia: d.get('urgente') ? 'urgente' : 'normal',
      p_mensaje: mensaje,
      p_contacto: String(d.get('contacto') || '').trim()
    }).then(function (r) {
      state.busy = false;
      var res = r && r.data;
      if (r && !r.error && res && res.ok) {
        state.msg = 'Listo, recibimos tu pedido (n.º ' + res.id + '). Te respondemos a la brevedad.';
        state.msgKind = 'ok'; state.lastId = res.id;
      } else {
        var code = res && res.error;
        state.msg = ERRORES[code] || 'No pudimos enviar el pedido. Probá de nuevo en un momento.';
        state.msgKind = 'err';
      }
      state.focused = true; draw();
    }, function () {
      state.busy = false; state.msg = 'No pudimos enviar el pedido. Revisá tu conexión y probá de nuevo.'; state.msgKind = 'err'; draw();
    });
  }

  function setLogged(session) {
    state.logged = !!(session && session.user);
    if (!state.logged) state.open = false;
    draw();
  }

  function init(client, opts) {
    if (!client || !client.rpc || !client.auth) { console.warn('[FoxSoporte] falta el cliente de Supabase'); return; }
    if (state.client) return;
    state.client = client;
    state.opts = opts || {};
    ensureHost();
    client.auth.getSession().then(function (r) { setLogged(r && r.data && r.data.session); });
    client.auth.onAuthStateChange(function (_e, session) { setLogged(session); });
  }

  w.FoxSoporte = { init: init, open: open, close: close };
})(window);
