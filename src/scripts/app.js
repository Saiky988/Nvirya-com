(function() {
  'use strict';

  var STORAGE_KEY = 'nvirya_theme_pref';
  var mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var appState = {
    themePref: document.documentElement.getAttribute('data-theme-pref') || 'system',
    resolvedTheme: document.documentElement.getAttribute('data-theme') || 'light',
    reducedMotion: motionQuery ? motionQuery.matches : false,
    activeFilter: 'all',
    viewMode: 'editorial',
    activeArchTab: 'adguard',
    simConfig: {
      popupProtection: true,
      redirectProtection: true,
      cosmeticFiltering: true,
      playerProtection: true,
      antiAdblock: true,
      elementPicker: true
    },
    three: {
      paused: false,
      showWireframe: true,
      showRings: true,
      showNodes: true,
      inViewport: true,
      pageVisible: !document.hidden,
      initialized: false,
      disposed: false,
      rafId: null,
      renderer: null,
      scene: null,
      camera: null,
      rootGroup: null,
      outerEdges: null,
      innerMesh: null,
      innerEdges: null,
      ringsGroup: null,
      nodesPoints: null,
      pointerX: 0,
      pointerY: 0,
      targetX: 0,
      targetY: 0
    }
  };

  /* ------------------------------------------------------------------------
     1. Toast Notification Helper (Sandbox-safe, zero alert/confirm/prompt)
     ------------------------------------------------------------------------ */
  var toastTimer = null;
  function showToast(message) {
    var toastEl = document.getElementById('toastBanner');
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('is-visible');
    }, 2600);
  }

  /* ------------------------------------------------------------------------
     2. Clipboard Helper with Fallback
     ------------------------------------------------------------------------ */
  function copyTextToClipboard(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('Copied ' + label + ' to clipboard');
      }).catch(function() {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied ' + label + ' to clipboard');
    } catch (e) {
      showToast('Copy unavailable in this environment');
    }
  }

  /* ------------------------------------------------------------------------
     3. Theme Engine (System / Light / Dark + OS Listener + Persistence)
     ------------------------------------------------------------------------ */
  function resolveTheme(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    var isDark = mediaQuery ? mediaQuery.matches : false;
    return isDark ? 'dark' : 'light';
  }

  function applyTheme(pref, persist) {
    var resolved = resolveTheme(pref);
    appState.themePref = pref;
    appState.resolvedTheme = resolved;

    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-pref', pref);

    var metaTheme = document.getElementById('metaThemeColor');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'dark' ? '#09090B' : '#FAFAFA');
    }

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, pref);
      } catch (e) {}
    }

    var buttons = document.querySelectorAll('.theme-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var mode = btn.getAttribute('data-theme-mode');
      var isSelected = mode === pref;
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    }

    var footerThemeStatus = document.getElementById('footerThemeStatus');
    if (footerThemeStatus) {
      footerThemeStatus.textContent = pref.toUpperCase() + ' (' + resolved.toUpperCase() + ')';
    }

    updateThreePalette();
  }

  function initThemeControls() {
    applyTheme(appState.themePref, false);

    var buttons = document.querySelectorAll('.theme-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        var mode = e.currentTarget.getAttribute('data-theme-mode');
        if (mode) {
          applyTheme(mode, true);
          showToast('Theme set to ' + mode.toUpperCase());
        }
      });
    }

    if (mediaQuery) {
      var onMediaChange = function() {
        if (appState.themePref === 'system') {
          applyTheme('system', false);
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onMediaChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(onMediaChange);
      }
    }
  }

  /* ------------------------------------------------------------------------
     4. Responsive Mobile Navigation & Section Spy
     ------------------------------------------------------------------------ */
  function initNavigation() {
    var mobileBtn = document.getElementById('mobileMenuBtn');
    var mobileDrawer = document.getElementById('mobileNavDrawer');
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', function() {
        var expanded = mobileBtn.getAttribute('aria-expanded') === 'true';
        var nextState = !expanded;
        mobileBtn.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        mobileDrawer.classList.toggle('is-open', nextState);
      });

      var mobileLinks = mobileDrawer.querySelectorAll('a');
      for (var i = 0; i < mobileLinks.length; i++) {
        mobileLinks[i].addEventListener('click', function() {
          mobileBtn.setAttribute('aria-expanded', 'false');
          mobileDrawer.classList.remove('is-open');
        });
      }

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileDrawer.classList.contains('is-open')) {
          mobileBtn.setAttribute('aria-expanded', 'false');
          mobileDrawer.classList.remove('is-open');
          mobileBtn.focus();
        }
      });
    }

    var sections = document.querySelectorAll('main section[id]');
    var navLinks = document.querySelectorAll('.desktop-nav .nav-link');
    if ('IntersectionObserver' in window && sections.length && navLinks.length) {
      var spyObserver = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var id = entries[i].target.getAttribute('id');
            for (var j = 0; j < navLinks.length; j++) {
              var href = navLinks[j].getAttribute('href');
              navLinks[j].classList.toggle('is-active', href === '#' + id);
            }
          }
        }
      }, { rootMargin: '-25% 0px -65% 0px' });

      for (var k = 0; k < sections.length; k++) {
        spyObserver.observe(sections[k]);
      }
    }
  }

  /* ------------------------------------------------------------------------
     5. Selected Work Filtering, Layout View Mode & AdGuard Simulator
     ------------------------------------------------------------------------ */
  function initWorkSection() {
    var filterButtons = document.querySelectorAll('.filter-chip[data-filter]');
    var entries = document.querySelectorAll('.project-entry[data-category]');
    var countEl = document.getElementById('workVisibleCount');

    function applyFilter(cat) {
      appState.activeFilter = cat;
      for (var i = 0; i < filterButtons.length; i++) {
        var isMatch = filterButtons[i].getAttribute('data-filter') === cat;
        filterButtons[i].classList.toggle('is-active', isMatch);
        filterButtons[i].setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      }

      var visible = 0;
      for (var j = 0; j < entries.length; j++) {
        var entryCat = entries[j].getAttribute('data-category') || '';
        var show = (cat === 'all') || (entryCat.indexOf(cat) !== -1);
        entries[j].classList.toggle('is-filtered-out', !show);
        if (show) visible++;
      }

      var asymRow = document.getElementById('asymmetricProjectRow');
      if (asymRow) {
        var rowChildren = asymRow.querySelectorAll('.project-entry');
        var anyChildVisible = false;
        for (var r = 0; r < rowChildren.length; r++) {
          if (!rowChildren[r].classList.contains('is-filtered-out')) {
            anyChildVisible = true;
          }
        }
        asymRow.style.display = anyChildVisible ? '' : 'none';
      }

      if (countEl) {
        countEl.textContent = visible + ' / 4 SYSTEMS SHOWN';
      }
    }

    for (var i = 0; i < filterButtons.length; i++) {
      filterButtons[i].addEventListener('click', function(e) {
        var cat = e.currentTarget.getAttribute('data-filter') || 'all';
        applyFilter(cat);
      });
    }

    var viewButtons = document.querySelectorAll('.view-mode-btn[data-view]');
    var showcaseEl = document.getElementById('projectShowcaseContainer');
    var tableWrapEl = document.getElementById('projectIndexTableContainer');

    for (var v = 0; v < viewButtons.length; v++) {
      viewButtons[v].addEventListener('click', function(e) {
        var mode = e.currentTarget.getAttribute('data-view');
        appState.viewMode = mode;
        for (var b = 0; b < viewButtons.length; b++) {
          var active = viewButtons[b].getAttribute('data-view') === mode;
          viewButtons[b].classList.toggle('is-active', active);
          viewButtons[b].setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (showcaseEl && tableWrapEl) {
          showcaseEl.classList.toggle('is-hidden', mode === 'table');
          tableWrapEl.classList.toggle('is-visible', mode === 'table');
        }
      });
    }

    /* Interactive AdGuard Runtime Simulator */
    var simButtons = document.querySelectorAll('.sim-toggle-btn[data-sim-key]');
    var simLog = document.getElementById('adguardSimOutput');
    var simActiveBadge = document.getElementById('adguardActiveRulesBadge');

    function updateSimOutput(lastToggledKey) {
      var activeKeys = [];
      for (var k in appState.simConfig) {
        if (appState.simConfig[k]) activeKeys.push(k);
      }
      if (simActiveBadge) {
        simActiveBadge.textContent = activeKeys.length + '/6 HOOKS ACTIVE';
      }
      if (!simLog) return;

      var descriptions = {
        popupProtection: 'window.open & synthetic blank-tab navigation intercepted before tab spawn.',
        redirectProtection: 'location.assign/replace & history state hijacking neutralized.',
        cosmeticFiltering: 'Ad containers & high-z-index invisible click-overlays pruned.',
        playerProtection: 'Protected media nodes (<video>, JWPlayer, Video.js, Plyr) whitelisted.',
        antiAdblock: 'Overlay wall & scroll-lock scripts disarmed at document-start.',
        elementPicker: 'Shadow DOM interactive selector picker armed for custom site rules.'
      };

      var statusLine = lastToggledKey
        ? ('[' + lastToggledKey + ': ' + (appState.simConfig[lastToggledKey] ? 'ENABLED' : 'BYPASSED') + '] ' + descriptions[lastToggledKey])
        : '[document-start] All 6 protection layers active across frames. Media player nodes (<video>, .jwplayer, .vjs) guarded.';

      simLog.textContent = statusLine;
    }

    for (var s = 0; s < simButtons.length; s++) {
      simButtons[s].addEventListener('click', function(e) {
        var btn = e.currentTarget;
        var key = btn.getAttribute('data-sim-key');
        if (!key) return;
        appState.simConfig[key] = !appState.simConfig[key];
        var isOn = appState.simConfig[key];
        btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        var pill = btn.querySelector('.sim-state-pill');
        if (pill) pill.textContent = isOn ? 'ON' : 'OFF';
        updateSimOutput(key);
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. Architecture & Specification Inspector Tabs
     ------------------------------------------------------------------------ */
  var ARCH_SPECS = {
    adguard: {
      title: 'Nvirya AdGuard v10.4 — Runtime Interception & Storage Architecture',
      meta: 'USERSCRIPT · @run-at document-start · @all-frames true · MIT LICENSE',
      summary: 'Executes before host page scripts to wrap navigation APIs, guard media players against false-positive removal, and isolate its mobile action sheet inside a closed/open Shadow DOM boundary.',
      filename: 'nvirya-adguard.user.js (v10.3.0 / v10.4.1.8)',
      code: [
        "// ==UserScript==",
        "// @name         Nvirya AdGuard",
        "// @namespace    https://nvirya.com/adguard",
        "// @version      10.4.1.8",
        "// @match        *://*/*",
        "// @run-at       document-start",
        "// @all-frames   true",
        "// ==/UserScript==",
        "",
        "const DEFAULT_CONFIG = {",
        "  version: 3,",
        "  enabled: true,",
        "  popupProtection: true,      // Hooks window.open & synthetic click-hijacks",
        "  redirectProtection: true,   // Guards location.assign/replace & nested ad URLs",
        "  cosmeticFiltering: true,    // MutationObserver + selector pruning",
        "  playerProtection: true,     // Preserves <video>, JWPlayer, Video.js, Plyr",
        "  antiAdblock: true,          // Neutralizes overlay walls & scroll locks",
        "  strictMode: false,",
        "  elementPicker: true,        // Interactive Shadow DOM element selector",
        "  edgeHandle: true,",
        "  theme: 'auto'               // 'auto' | 'light' | 'dark'",
        "};"
      ].join('\n')
    },
    elyriax: {
      title: 'Elyriax / Nvirya AI — Unified Workspace & Streaming Inspector',
      meta: 'WEB APPLICATION · https://nvirya.com · THREE-PANE SHELL',
      summary: 'A unified workspace for multi-model conversations, reasoning trace inspection, token usage telemetry, and artifact management with zero external UI framework bloat.',
      filename: 'elyriax-workspace-shell.spec.json',
      code: [
        "{",
        "  \"application\": \"Nvirya AI / Elyriax Workspace\",",
        "  \"canonicalOrigin\": \"https://nvirya.com\",",
        "  \"apiEndpoint\": \"https://api.nvirya.com\",",
        "  \"layout\": {",
        "    \"leftPane\": \"Collapsible conversation history & pinned threads (272px / 76px)\",",
        "    \"centerStage\": \"Streaming message viewport, reasoning trace block & composer\",",
        "    \"rightInspector\": \"Live token budget bar, active context files & plugin toggles\"",
        "  },",
        "  \"capabilities\": [",
        "    \"Real-time collapsible reasoning & chain-of-thought inspection\",",
        "    \"Keyboard-first command palette (Cmd/Ctrl + K) & model selector\",",
        "    \"Syntax-highlighted code blocks with instant clipboard export\"",
        "  ]",
        "}"
      ].join('\n')
    },
    api: {
      title: 'Nvirya API & Sachitone Translator Runtime Topology',
      meta: 'BACKEND SERVICES · https://api.nvirya.com · FASTAPI + UVICORN + SQLITE',
      summary: 'Low-overhead service endpoints backing workspace dispatch, raw userscript distribution, and asynchronous multi-guild translation workflows with SQLite persistence.',
      filename: 'runtime-topology.yaml',
      code: [
        "services:",
        "  nvirya_api_gateway:",
        "    endpoint: https://api.nvirya.com",
        "    role: Workspace session dispatch, model routing & telemetry",
        "  raw_distribution:",
        "    endpoint: https://raw.nvirya.com/adguard/nvirya-adguard.user.js",
        "    role: Versioned userscript delivery & update manifest",
        "  nvirya_translate_runtime:",
        "    server: Uvicorn / FastAPI (0.0.0.0:25405)",
        "    persistence: SQLite (data/translator.db) + In-memory channel cache",
        "    modules:",
        "      - apps.bot.cogs.translate",
        "      - apps.bot.cogs.auto_translate",
        "      - apps.bot.cogs.settings"
      ].join('\n')
    }
  };

  function selectArchTab(tabKey, scrollToSection) {
    var spec = ARCH_SPECS[tabKey];
    if (!spec) return;
    appState.activeArchTab = tabKey;

    var tabBtns = document.querySelectorAll('.arch-tab-btn[data-arch-tab]');
    for (var i = 0; i < tabBtns.length; i++) {
      var isSelected = tabBtns[i].getAttribute('data-arch-tab') === tabKey;
      tabBtns[i].setAttribute('aria-selected', isSelected ? 'true' : 'false');
    }

    var titleEl = document.getElementById('archPanelTitle');
    var metaEl = document.getElementById('archPanelMeta');
    var summaryEl = document.getElementById('archPanelSummary');
    var fileEl = document.getElementById('archPanelFilename');
    var codeEl = document.getElementById('archPanelCode');

    if (titleEl) titleEl.textContent = spec.title;
    if (metaEl) metaEl.textContent = spec.meta;
    if (summaryEl) summaryEl.textContent = spec.summary;
    if (fileEl) fileEl.textContent = spec.filename;
    if (codeEl) codeEl.textContent = spec.code;

    if (scrollToSection) {
      var sectionEl = document.getElementById('architecture');
      if (sectionEl && sectionEl.scrollIntoView) {
        sectionEl.scrollIntoView({ behavior: appState.reducedMotion ? 'auto' : 'smooth' });
      }
    }
  }

  function initArchitectureInspector() {
    var tabBtns = document.querySelectorAll('.arch-tab-btn[data-arch-tab]');
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function(e) {
        var key = e.currentTarget.getAttribute('data-arch-tab');
        if (key) selectArchTab(key, false);
      });
    }

    var jumpBtns = document.querySelectorAll('[data-inspect-arch]');
    for (var j = 0; j < jumpBtns.length; j++) {
      jumpBtns[j].addEventListener('click', function(e) {
        e.preventDefault();
        var key = e.currentTarget.getAttribute('data-inspect-arch');
        if (key) selectArchTab(key, true);
      });
    }

    var copySpecBtn = document.getElementById('copyArchSpecBtn');
    if (copySpecBtn) {
      copySpecBtn.addEventListener('click', function() {
        var spec = ARCH_SPECS[appState.activeArchTab];
        if (spec) {
          copyTextToClipboard(spec.code, spec.filename);
        }
      });
    }

    var copyRouteBtn = document.getElementById('copyRouteBtn');
    if (copyRouteBtn) {
      copyRouteBtn.addEventListener('click', function() {
        copyTextToClipboard('https://nvirya.com/@me', 'canonical URL (https://nvirya.com/@me)');
      });
    }
  }

  /* ------------------------------------------------------------------------
     7. Three.js Precision Computational Geometry Experience (Phase 3)
        - Dynamically loaded after initial paint
        - Theme-aware materials (Light & Dark)
        - Respects prefers-reduced-motion
        - Pauses when offscreen or hidden
        - Full WebGL fallback + GPU disposal
     ------------------------------------------------------------------------ */
  function getThemeColors() {
    var isDark = appState.resolvedTheme === 'dark';
    return {
      outerWire: isDark ? 0xE4E4E7 : 0x18181B,
      innerWire: isDark ? 0x71717A : 0x52525B,
      innerSolid: isDark ? 0x18181B : 0xE4E4E7,
      rings: isDark ? 0x52525B : 0xA1A1AA,
      nodes: isDark ? 0xFAFAFA : 0x0A0A0B
    };
  }

  function updateThreePalette() {
    var t = appState.three;
    if (!t.initialized || t.disposed) return;
    var palette = getThemeColors();
    if (t.outerEdges && t.outerEdges.material) {
      t.outerEdges.material.color.setHex(palette.outerWire);
    }
    if (t.innerEdges && t.innerEdges.material) {
      t.innerEdges.material.color.setHex(palette.innerWire);
    }
    if (t.innerMesh && t.innerMesh.material) {
      t.innerMesh.material.color.setHex(palette.innerSolid);
    }
    if (t.ringsGroup) {
      for (var i = 0; i < t.ringsGroup.children.length; i++) {
        var child = t.ringsGroup.children[i];
        if (child.material) child.material.color.setHex(palette.rings);
      }
    }
    if (t.nodesPoints && t.nodesPoints.material) {
      t.nodesPoints.material.color.setHex(palette.nodes);
    }
    renderSingleFrame();
  }

  function renderSingleFrame() {
    var t = appState.three;
    if (!t.initialized || t.disposed || !t.renderer || !t.scene || !t.camera) return;
    t.renderer.render(t.scene, t.camera);
  }

  function shouldAnimateThree() {
    var t = appState.three;
    return (
      t.initialized &&
      !t.disposed &&
      !t.paused &&
      !appState.reducedMotion &&
      t.inViewport &&
      t.pageVisible
    );
  }

  function startThreeLoop() {
    var t = appState.three;
    if (t.rafId !== null) return;
    if (!shouldAnimateThree()) {
      renderSingleFrame();
      updateHudStatusText();
      return;
    }
    updateHudStatusText();

    var lastTime = performance.now();
    function animate(now) {
      t.rafId = null;
      if (!shouldAnimateThree()) return;

      var dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      t.pointerX += (t.targetX - t.pointerX) * 0.06;
      t.pointerY += (t.targetY - t.pointerY) * 0.06;

      if (t.rootGroup) {
        t.rootGroup.rotation.y += dt * 0.22;
        t.rootGroup.rotation.x = 0.28 + t.pointerY * 0.35;
        t.rootGroup.rotation.z = t.pointerX * 0.25;
      }
      if (t.innerMesh) {
        t.innerMesh.rotation.y -= dt * 0.36;
        t.innerMesh.rotation.x += dt * 0.14;
      }
      if (t.ringsGroup) {
        t.ringsGroup.rotation.z += dt * 0.15;
      }

      t.renderer.render(t.scene, t.camera);
      t.rafId = window.requestAnimationFrame(animate);
    }

    t.rafId = window.requestAnimationFrame(animate);
  }

  function stopThreeLoop() {
    var t = appState.three;
    if (t.rafId !== null) {
      window.cancelAnimationFrame(t.rafId);
      t.rafId = null;
    }
    updateHudStatusText();
  }

  function updateHudStatusText() {
    var statusEl = document.getElementById('threeStatusLabel');
    if (!statusEl) return;
    var t = appState.three;
    if (!t.initialized || t.disposed) {
      statusEl.textContent = 'SVG BLUEPRINT · STATIC';
      return;
    }
    if (appState.reducedMotion) {
      statusEl.textContent = 'WEBGL · REDUCED MOTION';
    } else if (t.paused) {
      statusEl.textContent = 'WEBGL · PAUSED';
    } else {
      statusEl.textContent = 'WEBGL · ORBITAL LATTICE';
    }
  }

  function buildOrbitalRing(THREE, radius, segments, tiltX, tiltY, colorHex) {
    var positions = new Float32Array((segments + 1) * 3);
    for (var i = 0; i <= segments; i++) {
      var theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius;
      positions[i * 3 + 2] = 0;
    }
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.45
    });
    var line = new THREE.Line(geom, mat);
    line.rotation.x = tiltX;
    line.rotation.y = tiltY;
    return line;
  }

  function initThreeScene() {
    var stage = document.getElementById('heroCanvasStage');
    var canvas = document.getElementById('heroThreeCanvas');
    var fallback = document.getElementById('webglFallback');
    if (!stage || !canvas || typeof window.THREE === 'undefined') {
      updateHudStatusText();
      return;
    }

    var THREE = window.THREE;
    var t = appState.three;

    try {
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        updateHudStatusText();
        return;
      }

      var isMobile = window.innerWidth < 768;
      var maxDpr = isMobile ? 1.5 : 2;
      var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'low-power'
      });
      renderer.setPixelRatio(dpr);

      var rect = stage.getBoundingClientRect();
      var width = Math.max(rect.width, 280);
      var height = Math.max(rect.height, 280);
      renderer.setSize(width, height, false);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
      camera.position.set(0, 0, 5.4);

      var rootGroup = new THREE.Group();
      rootGroup.rotation.x = 0.28;
      rootGroup.rotation.y = 0.42;
      scene.add(rootGroup);

      var palette = getThemeColors();

      /* 1. Outer Geodesic Wireframe Lattice */
      var outerGeo = new THREE.IcosahedronGeometry(1.48, 1);
      var outerEdgesGeo = new THREE.EdgesGeometry(outerGeo);
      var outerMat = new THREE.LineBasicMaterial({
        color: palette.outerWire,
        transparent: true,
        opacity: 0.72
      });
      var outerEdges = new THREE.LineSegments(outerEdgesGeo, outerMat);
      rootGroup.add(outerEdges);

      /* 2. Inner Precision Core (Octahedron + Wire Edges) */
      var innerGeo = new THREE.OctahedronGeometry(0.76, 0);
      var innerSolidMat = new THREE.MeshBasicMaterial({
        color: palette.innerSolid,
        transparent: true,
        opacity: 0.35
      });
      var innerMesh = new THREE.Mesh(innerGeo, innerSolidMat);

      var innerEdgesGeo = new THREE.EdgesGeometry(innerGeo);
      var innerEdgesMat = new THREE.LineBasicMaterial({
        color: palette.innerWire,
        transparent: true,
        opacity: 0.9
      });
      var innerEdges = new THREE.LineSegments(innerEdgesGeo, innerEdgesMat);
      innerMesh.add(innerEdges);
      rootGroup.add(innerMesh);

      /* 3. Orthogonal Coordinate Rings */
      var ringsGroup = new THREE.Group();
      ringsGroup.add(buildOrbitalRing(THREE, 1.88, 72, Math.PI / 2.3, 0.2, palette.rings));
      ringsGroup.add(buildOrbitalRing(THREE, 2.05, 72, -Math.PI / 3.1, -0.5, palette.rings));
      rootGroup.add(ringsGroup);

      /* 4. Vertex Telemetry Nodes */
      var posAttr = outerGeo.getAttribute('position');
      var uniqueMap = {};
      var nodeCoords = [];
      for (var i = 0; i < posAttr.count; i++) {
        var vx = posAttr.getX(i);
        var vy = posAttr.getY(i);
        var vz = posAttr.getZ(i);
        var key = vx.toFixed(2) + ',' + vy.toFixed(2) + ',' + vz.toFixed(2);
        if (!uniqueMap[key]) {
          uniqueMap[key] = true;
          nodeCoords.push(vx, vy, vz);
        }
      }
      outerGeo.dispose();

      var nodesGeo = new THREE.BufferGeometry();
      nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodeCoords, 3));
      var nodesMat = new THREE.PointsMaterial({
        color: palette.nodes,
        size: 0.055,
        sizeAttenuation: true
      });
      var nodesPoints = new THREE.Points(nodesGeo, nodesMat);
      rootGroup.add(nodesPoints);

      t.renderer = renderer;
      t.scene = scene;
      t.camera = camera;
      t.rootGroup = rootGroup;
      t.outerEdges = outerEdges;
      t.innerMesh = innerMesh;
      t.innerEdges = innerEdges;
      t.ringsGroup = ringsGroup;
      t.nodesPoints = nodesPoints;
      t.initialized = true;

      if (fallback) {
        fallback.classList.add('is-hidden');
      }

      /* Pointer & Touch Interaction (non-blocking for scroll) */
      stage.addEventListener('pointermove', function(e) {
        var bounds = stage.getBoundingClientRect();
        var nx = ((e.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
        var ny = ((e.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1;
        t.targetX = nx * 0.65;
        t.targetY = ny * 0.65;
        if (!shouldAnimateThree()) {
          t.pointerX = t.targetX;
          t.pointerY = t.targetY;
          rootGroup.rotation.x = 0.28 + t.pointerY * 0.35;
          rootGroup.rotation.z = t.pointerX * 0.25;
          renderSingleFrame();
        }
      }, { passive: true });

      stage.addEventListener('pointerleave', function() {
        t.targetX = 0;
        t.targetY = 0;
      }, { passive: true });

      /* Context Loss & Restore Safety */
      canvas.addEventListener('webglcontextlost', function(e) {
        e.preventDefault();
        stopThreeLoop();
        if (fallback) fallback.classList.remove('is-hidden');
      }, false);

      canvas.addEventListener('webglcontextrestored', function() {
        if (fallback) fallback.classList.add('is-hidden');
        startThreeLoop();
      }, false);

      /* Resize Handling */
      var handleResize = function() {
        if (!t.initialized || t.disposed || !t.renderer || !t.camera) return;
        var r = stage.getBoundingClientRect();
        var w = Math.max(r.width, 240);
        var h = Math.max(r.height, 240);
        var mobileNow = window.innerWidth < 768;
        t.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileNow ? 1.5 : 2));
        t.renderer.setSize(w, h, false);
        t.camera.aspect = w / h;
        t.camera.updateProjectionMatrix();
        renderSingleFrame();
      };

      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('orientationchange', handleResize, { passive: true });

      /* Offscreen & Tab Visibility Pause */
      if ('IntersectionObserver' in window) {
        var stageObserver = new IntersectionObserver(function(entries) {
          if (!entries.length) return;
          t.inViewport = entries[0].isIntersecting;
          if (t.inViewport) {
            startThreeLoop();
          } else {
            stopThreeLoop();
          }
        }, { threshold: 0.05 });
        stageObserver.observe(stage);
      }

      document.addEventListener('visibilitychange', function() {
        t.pageVisible = !document.hidden;
        if (t.pageVisible) {
          startThreeLoop();
        } else {
          stopThreeLoop();
        }
      });

      renderSingleFrame();
      startThreeLoop();
    } catch (err) {
      if (fallback) fallback.classList.remove('is-hidden');
      updateHudStatusText();
    }
  }

  function disposeThreeScene() {
    var t = appState.three;
    if (!t.initialized || t.disposed) return;
    stopThreeLoop();
    t.disposed = true;
    try {
      if (t.scene) {
        t.scene.traverse(function(obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              for (var i = 0; i < obj.material.length; i++) obj.material[i].dispose();
            } else {
              obj.material.dispose();
            }
          }
        });
      }
      if (t.renderer) {
        t.renderer.dispose();
      }
    } catch (e) {}
  }

  function initThreeControlsAndLoader() {
    var toggleMotionBtn = document.getElementById('hudToggleMotionBtn');
    var toggleRingsBtn = document.getElementById('hudToggleRingsBtn');
    var resetViewBtn = document.getElementById('hudResetViewBtn');

    if (toggleMotionBtn) {
      toggleMotionBtn.addEventListener('click', function() {
        var t = appState.three;
        t.paused = !t.paused;
        toggleMotionBtn.setAttribute('aria-pressed', t.paused ? 'true' : 'false');
        toggleMotionBtn.textContent = t.paused ? 'Resume' : 'Pause';
        if (t.paused) {
          stopThreeLoop();
        } else {
          startThreeLoop();
        }
      });
    }

    if (toggleRingsBtn) {
      toggleRingsBtn.addEventListener('click', function() {
        var t = appState.three;
        t.showRings = !t.showRings;
        toggleRingsBtn.setAttribute('aria-pressed', t.showRings ? 'true' : 'false');
        if (t.ringsGroup) {
          t.ringsGroup.visible = t.showRings;
          renderSingleFrame();
        }
      });
    }

    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', function() {
        var t = appState.three;
        t.targetX = 0;
        t.targetY = 0;
        t.pointerX = 0;
        t.pointerY = 0;
        if (t.rootGroup) {
          t.rootGroup.rotation.set(0.28, 0.42, 0);
        }
        if (t.innerMesh) {
          t.innerMesh.rotation.set(0, 0, 0);
        }
        renderSingleFrame();
        showToast('Lattice orientation reset');
      });
    }

    if (motionQuery) {
      var onMotionPrefChange = function(e) {
        appState.reducedMotion = e.matches;
        if (appState.reducedMotion) {
          stopThreeLoop();
          renderSingleFrame();
        } else {
          startThreeLoop();
        }
      };
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', onMotionPrefChange);
      } else if (motionQuery.addListener) {
        motionQuery.addListener(onMotionPrefChange);
      }
    }

    window.addEventListener('pagehide', disposeThreeScene);

    /* Dynamically load Three.js after initial render so main content paints first */
    if (typeof window.THREE !== 'undefined') {
      initThreeScene();
    } else {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = function() {
        initThreeScene();
      };
      script.onerror = function() {
        updateHudStatusText();
      };
      document.head.appendChild(script);
    }
  }

  /* ------------------------------------------------------------------------
     8. Boot Sequence
     ------------------------------------------------------------------------ */
  function boot() {
    initThemeControls();
    initNavigation();
    initWorkSection();
    initArchitectureInspector();
    initThreeControlsAndLoader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
