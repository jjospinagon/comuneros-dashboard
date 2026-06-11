// ==UserScript==
// @name         Certificados Colombia - Autollenado
// @namespace    monaco.certificados
// @version      1.0
// @description  Autollena cédula, fecha de expedición, NIT y razón social en los portales de antecedentes (Procuraduría, Contraloría, Policía, RNMC, REDAM, Delitos Sexuales). Usted solo resuelve el captcha.
// @match        https://*.procuraduria.gov.co/*
// @match        https://*.contraloria.gov.co/*
// @match        https://antecedentes.policia.gov.co:7005/*
// @match        https://srvcnpc.policia.gov.co/*
// @match        https://*.redam.gov.co/*
// @match        https://inhabilidades.policia.gov.co:8080/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/* Instalación:
   PC:      Chrome/Edge/Firefox + extensión Tampermonkey → crear nuevo script → pegar esto.
   Celular: Firefox para Android + Tampermonkey (addons) → igual.
   Uso: abra cualquier portal; aparece el panel azul "Certificados".
        Guarde los datos una vez y pulse LLENAR en cada portal. */

(function () {
  'use strict';

  var PATRONES = {
    cedula: /(documento|cedula|identificac|nuip|nro.?doc|numero.?doc|txt.?doc|expediente)/,
    fecha:  /(fecha.{0,12}exped|exped.{0,12}fecha|fec.?exp)/,
    nit:    /\bnit\b/,
    razon:  /(razon.?social|entidad|empresa|consultante)/
  };

  function sinTildes(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Dispara los eventos que frameworks (Angular/React/ASP.NET) esperan
  function setValor(el, valor) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, valor);
    ['input', 'change', 'blur', 'keyup'].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true }));
    });
  }

  function llenar() {
    var datos = {
      cedula: GM_getValue('cedula', ''),
      fecha:  GM_getValue('fecha', ''),   // DD/MM/AAAA
      nit:    GM_getValue('nit', ''),
      razon:  GM_getValue('razon', '')
    };
    var n = 0;

    // Selects de tipo de documento → CÉDULA DE CIUDADANÍA
    document.querySelectorAll('select').forEach(function (sel) {
      for (var i = 0; i < sel.options.length; i++) {
        if (/(cedula\s+de\s+ciudadania|^c\.?c\.?$)/.test(sinTildes(sel.options[i].text))) {
          sel.value = sel.options[i].value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          n++; break;
        }
      }
    });

    // Inputs por firma (name/id/placeholder/aria-label/formcontrolname/label)
    document.querySelectorAll('input[type=text],input[type=tel],input[type=number],input[type=date],input:not([type])')
      .forEach(function (inp) {
        if (inp.offsetParent === null || inp.disabled || inp.readOnly) return;
        var firma = sinTildes([inp.name, inp.id, inp.placeholder,
          inp.getAttribute('aria-label'), inp.getAttribute('formcontrolname')].join(' '));
        if (inp.id) {
          var lab = document.querySelector('label[for="' + inp.id + '"]');
          if (lab) firma += ' ' + sinTildes(lab.textContent);
        }
        for (var campo in PATRONES) {
          if (datos[campo] && PATRONES[campo].test(firma)) {
            var v = datos[campo];
            if (campo === 'fecha' && inp.type === 'date') {
              var p = v.split('/'); v = p[2] + '-' + p[1] + '-' + p[0];
            }
            setValor(inp, v);
            n++; break;
          }
        }
      });

    aviso(n ? '✓ ' + n + ' campo(s) llenados. Resuelva el captcha.' : 'No se detectaron campos. ¿Ya cargó el formulario?');
  }

  // ---------------- Panel flotante ----------------
  var css = 'position:fixed;z-index:999999;top:8px;right:8px;background:#1a3a6b;color:#fff;' +
            'font:12px/1.4 Arial;border-radius:10px;padding:8px;box-shadow:0 2px 10px rgba(0,0,0,.4);' +
            'max-width:230px;';
  var panel = document.createElement('div');
  panel.setAttribute('style', css);
  panel.innerHTML =
    '<b style="font-size:12px">📋 Certificados</b> ' +
    '<a id="cf_min" style="float:right;cursor:pointer;color:#fff;text-decoration:none">▁</a>' +
    '<div id="cf_cuerpo" style="margin-top:6px">' +
      campo('cedula', 'Cédula') + campo('fecha', 'Fecha exp. DD/MM/AAAA') +
      campo('nit', 'NIT empresa') + campo('razon', 'Razón social') +
      '<button id="cf_llenar" style="width:100%;margin-top:6px;background:#1e8e3e;color:#fff;border:0;border-radius:6px;padding:8px;font-weight:bold;cursor:pointer">LLENAR FORMULARIO</button>' +
      '<div id="cf_msj" style="margin-top:4px;font-size:11px;opacity:.9"></div>' +
    '</div>';

  function campo(id, ph) {
    return '<input id="cf_' + id + '" placeholder="' + ph + '" value="' + (GM_getValue(id, '') || '') +
           '" style="width:100%;margin-top:4px;padding:6px;border:0;border-radius:5px;font-size:12px;color:#222">';
  }
  function aviso(t) { var m = document.getElementById('cf_msj'); if (m) m.textContent = t; }

  function montar() {
    if (!document.body) return setTimeout(montar, 500);
    document.body.appendChild(panel);
    ['cedula', 'fecha', 'nit', 'razon'].forEach(function (id) {
      document.getElementById('cf_' + id).addEventListener('change', function () {
        GM_setValue(id, this.value.trim());
      });
    });
    document.getElementById('cf_llenar').addEventListener('click', llenar);
    document.getElementById('cf_min').addEventListener('click', function () {
      var c = document.getElementById('cf_cuerpo');
      c.style.display = c.style.display === 'none' ? 'block' : 'none';
    });
  }
  montar();
})();
