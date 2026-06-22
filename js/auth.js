const STA_Auth = {
  currentUser: null,
  isAnonymous: false,

  init() {
    const stored = localStorage.getItem('sta_session');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.currentUser = data.user || null;
        this.isAnonymous = data.isAnonymous || false;
        return true;
      } catch (e) {
        this.clearSession();
      }
    }
    return false;
  },

  async login(username, password) {
    const pwdHash = await this.hashPassword(password);

    const data = await DB._rest('GET', 'users', {
      select: '*',
      query: 'username=eq.' + encodeURIComponent(username)
    });

    if (!data || data.length === 0) throw new Error('Usuário não encontrado');

    const user = data[0];
    if (user.password_hash !== pwdHash) throw new Error('Senha incorreta');

    this.currentUser = { id: user.id, username: user.username, role: user.role };
    this.isAnonymous = false;
    this.saveSession();
    return this.currentUser;
  },

  async register(username, password, role) {
    const pwdHash = await this.hashPassword(password);

    const exist = await DB._rest('GET', 'users', {
      select: 'id',
      query: 'username=eq.' + encodeURIComponent(username)
    });
    if (exist && exist.length > 0) throw new Error('Usuário já existe');

    const [inserted] = await DB._rest('POST', 'users', {
      body: { username, password_hash: pwdHash, role },
      select: '*'
    });
    return inserted;
  },

  async deleteUser(id) {
    await DB._rest('DELETE', 'users', { query: 'id=eq.' + id });
  },

  async listUsers() {
    const data = await DB._rest('GET', 'users', { select: '*', order: 'username.asc' });
    return data || [];
  },

  logout() {
    this.currentUser = null;
    this.isAnonymous = false;
    this.clearSession();
    window.location.reload();
  },

  anonymousLogin() {
    this.isAnonymous = true;
    this.currentUser = null;
    this.saveSession();
    window.location.reload();
  },

  saveSession() {
    localStorage.setItem('sta_session', JSON.stringify({
      user: this.currentUser,
      isAnonymous: this.isAnonymous
    }));
  },

  clearSession() {
    localStorage.removeItem('sta_session');
  },

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /* ─── Permission Checks ─── */

  canAccess(view) {
    if (this.isAnonymous) {
      return ['militares', 'pcpd', 'criarPcpd'].includes(view);
    }
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'sta') {
      return true;
    }
    if (this.currentUser.role === 'salc') {
      return view === 'militares';
    }
    return false;
  },

  canEditMilitar(militarId) {
    if (this.isAnonymous) {
      const ids = JSON.parse(localStorage.getItem('anonymous_militares') || '[]');
      return ids.includes(militarId);
    }
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'sta') return true;
    return false;
  },

  canDeleteMilitar(militarId) {
    if (this.isAnonymous) return false;
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'sta') return true;
    return false;
  },

  canCreateMilitar() {
    if (this.isAnonymous) return true;
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'sta') return true;
    return false;
  },

  canUploadArquivo(militarId) {
    if (this.isAnonymous) {
      const ids = JSON.parse(localStorage.getItem('anonymous_militares') || '[]');
      return ids.includes(militarId);
    }
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'sta') return true;
    if (this.currentUser.role === 'salc') return true;
    return false;
  },

  canManageUsers() {
    return this.currentUser?.role === 'admin';
  },

  isAuthenticated() {
    return !!this.currentUser || this.isAnonymous;
  },

  getRoleLabel() {
    if (this.isAnonymous) return 'Anônimo';
    if (!this.currentUser) return '';
    const labels = { admin: 'Administrador', sta: 'STA', salc: 'SALC' };
    return labels[this.currentUser.role] || this.currentUser.username;
  },

  addAnonymousMilitar(id) {
    const ids = JSON.parse(localStorage.getItem('anonymous_militares') || '[]');
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem('anonymous_militares', JSON.stringify(ids));
    }
  }
};
