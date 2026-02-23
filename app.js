// app.js — Demo estática para GitHub Pages (sin PHP/MySQL)

(function () {
  const KEY_SESSION = "medicloud_session_v1";
  const KEY_DATA = "medicloud_data_v1";
  const KEY_LOGS = "medicloud_logs_v1";

  // Credenciales demo (solo para enseñar funcionamiento en estático)
  const DEMO_USERS = [
    { username: "admin", password: "admin123", role: "admin", name: "Administrador" },
    { username: "cliente1", password: "client123", role: "client", name: "Cliente Demo", clientId: "c1" },
  ];

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeed() {
    const data = loadJSON(KEY_DATA, null);
    if (data) return;

    const seed = {
      clients: [
        { id: "c1", nombre_empresa: "Clínica Norte", email: "contacto@clinicanorte.es", telefono: "+34 600 000 001", estado: "activo" },
        { id: "c2", nombre_empresa: "Centro Salud Sur", email: "info@saludsur.es", telefono: "+34 600 000 002", estado: "activo" },
      ],
      usuariosClientes: [
        { id: "u1", clientId: "c1", username: "cliente1", estado: "activo" },
      ],
      docs: [
        { id: "d1", clientId: "c1", nombre: "informe_demo.pdf", sizeBytes: 245761, ts: Date.now() - 86400000 },
      ],
    };

    saveJSON(KEY_DATA, seed);

// =========================
// Cookies (banner simple)
// =========================
(function () {
  const banner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('acceptCookies');

  if (!banner || !acceptBtn) return;

  // Si ya aceptó cookies, no mostrar
  if (localStorage.getItem('cookiesAccepted') === 'true') {
    banner.style.display = 'none';
    return;
  }

  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    banner.style.display = 'none';
  });
})();


    // logs iniciales
    if (!localStorage.getItem(KEY_LOGS)) {
      saveJSON(KEY_LOGS, [
        { ts: Date.now() - 3600000, actor: "system", action: "Inicialización de datos demo", ref: "-" }
      ]);
    }
  }

  ensureSeed();

  const MedicloudAuth = {
    login(username, password) {
      const u = DEMO_USERS.find(x => x.username === username && x.password === password);
      if (!u) return { ok: false, message: "Credenciales incorrectas (demo)." };

      const session = {
        username: u.username,
        role: u.role,
        name: u.name,
        clientId: u.clientId || null,
        ts: Date.now()
      };
      saveJSON(KEY_SESSION, session);

      MedicloudData.addLog({ actor: u.role, action: "Login (demo)", ref: u.username });
      return { ok: true, role: u.role };
    },

    logout() {
      const s = MedicloudAuth.getSession();
      if (s) MedicloudData.addLog({ actor: s.role, action: "Logout (demo)", ref: s.username });
      localStorage.removeItem(KEY_SESSION);
    },

    getSession() {
      return loadJSON(KEY_SESSION, null);
    },

    requireRole(role) {
      const s = MedicloudAuth.getSession();
      if (!s) {
        location.href = "login.html";
        return;
      }
      if (role && s.role !== role) {
        // Si entra con rol equivocado, redirige
        location.href = s.role === "admin" ? "admin_dashboard.html" : "client_dashboard.html";
      }
    }
  };

  const MedicloudData = {
    getData() {
      ensureSeed();
      return loadJSON(KEY_DATA, { clients: [], usuariosClientes: [], docs: [] });
    },

    setData(d) {
      saveJSON(KEY_DATA, d);
    },

    getClients() {
      return MedicloudData.getData().clients.filter(c => c.estado === "activo");
    },

    addClient({ nombre_empresa, email, telefono }) {
      const d = MedicloudData.getData();
      const id = "c" + Math.random().toString(16).slice(2, 10);
      d.clients.push({ id, nombre_empresa, email, telefono, estado: "activo" });
      MedicloudData.setData(d);
      return id;
    },

    deleteClient(id) {
      const d = MedicloudData.getData();
      d.clients = d.clients.map(c => c.id === id ? { ...c, estado: "inactivo" } : c);
      MedicloudData.setData(d);
    },

    getClientDocs(clientId) {
      const d = MedicloudData.getData();
      return d.docs.filter(x => x.clientId === clientId).sort((a,b)=>b.ts-a.ts);
    },

    addDoc({ clientId, nombre, sizeBytes }) {
      const d = MedicloudData.getData();
      const id = "d" + Math.random().toString(16).slice(2, 10);
      d.docs.push({ id, clientId, nombre, sizeBytes, ts: Date.now() });
      MedicloudData.setData(d);
      return id;
    },

    deleteDoc(id) {
      const d = MedicloudData.getData();
      d.docs = d.docs.filter(x => x.id !== id);
      MedicloudData.setData(d);
    },

    getStats() {
      const d = MedicloudData.getData();
      const clientes = d.clients.filter(c => c.estado === "activo").length;
      const usuariosClientes = d.usuariosClientes.filter(u => u.estado === "activo").length;
      const documentos = d.docs.length;
      const storage = d.docs.reduce((acc, x) => acc + (x.sizeBytes || 0), 0);

      return {
        clientes,
        usuariosClientes,
        documentos,
        storageBytes: storage,
        storageReadable: MedicloudData.formatBytes(storage)
      };
    },

    formatBytes(bytes) {
      const b = Number(bytes || 0);
      if (b < 1024) return `${b} B`;
      const kb = b / 1024;
      if (kb < 1024) return `${kb.toFixed(1)} KB`;
      const mb = kb / 1024;
      if (mb < 1024) return `${mb.toFixed(1)} MB`;
      const gb = mb / 1024;
      return `${gb.toFixed(2)} GB`;
    },

    // Logs (auditoría demo)
    getLogs() {
      return loadJSON(KEY_LOGS, []).sort((a,b)=>b.ts-a.ts);
    },

    addLog({ actor, action, ref }) {
      const logs = loadJSON(KEY_LOGS, []);
      logs.push({ ts: Date.now(), actor, action, ref: ref ?? "-" });
      saveJSON(KEY_LOGS, logs);
    },

    clearLogs() {
      saveJSON(KEY_LOGS, []);
    }
  };

  window.MedicloudAuth = MedicloudAuth;
  window.MedicloudData = MedicloudData;
})();