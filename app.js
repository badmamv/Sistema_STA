// ═══════════════════════════════════════════════════════════
//  STA - Sistema de Controle de Missões
//  Aplicação Web 100% cliente com localStorage
// ═══════════════════════════════════════════════════════════

/* ─── Utilities ─── */
const U = {
    fmtDate(d) { return d ? d.split('T')[0] : ''; },
    fmtDateBR(d) {
        if (!d) return '';
        const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAIO', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const p = d.split('T')[0].split('-');
        if (p.length !== 3) return d;
        const mes = parseInt(p[1]);
        if (mes < 1 || mes > 12) return d;
        return p[2] + '/' + meses[mes - 1] + '/' + p[0];
    },
    fmtBRL(v) {
        const n = parseFloat(v) || 0;
        const parts = n.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return 'R$ ' + parts.join(',');
    },
    today() { return new Date().toISOString().split('T')[0]; },
    /** Converte formato brasileiro "1.250,50" para número 1250.50 */
    parseBRL(v) {
        if (!v) return 0;
        return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
    },
    parseDateBR(d) {
        if (!d) return '';
        const p = d.split('/');
        if (p.length !== 3) return '';
        return p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0');
    },
    dataAttr(el, attr) { return el ? el.dataset[attr] : null; },
    escape(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    },
    situacaoClass(sit) {
        return sit === 'CANCELADO' || sit === 'RECOLHIDA' ? 'cancelada' : '';
    },
    valorPorExtenso(v) {
        if (!v) return '';
        const n = U.parseBRL(v);
        const inteiros = Math.floor(n);
        const centavos = Math.round((n - inteiros) * 100);
        
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dezena1 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        const f = (num) => {
            if (num === 0) return '';
            if (num === 100) return 'cem';
            let res = '';
            const c = Math.floor(num / 100);
            const d = Math.floor((num % 100) / 10);
            const u = num % 10;
            if (c > 0) res += centenas[c];
            if (d > 0) {
                if (res) res += ' e ';
                if (d === 1) {
                    res += dezena1[u];
                    return res;
                }
                res += dezenas[d];
            }
            if (u > 0) {
                if (res) res += ' e ';
                res += unidades[u];
            }
            return res;
        };

        let s = '';
        if (inteiros > 0) {
            const mil = Math.floor(inteiros / 1000);
            const rest = inteiros % 1000;
            if (mil > 0) {
                s += (mil === 1 ? 'mil' : f(mil) + ' mil');
                if (rest > 0) s += (rest < 100 || rest % 100 === 0 ? ' e ' : ', ');
            }
            if (rest > 0 || mil === 0) s += f(rest);
            s += (inteiros === 1 ? ' real' : ' reais');
        }

        if (centavos > 0) {
            if (s) s += ' e ';
            s += f(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
        }
        return s || 'zero reais';
    },
    numeroPorExtenso(n) {
        const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte'];
        if (n <= 20) return unidades[n];
        return n.toString(); // Simplificado para o momento
    },
    enableColResize(tableEl) {
        if (!tableEl) return;
        const EDGE = 10;

        tableEl.querySelectorAll('thead th').forEach(th => {
            const handle = document.createElement('div');
            handle.className = 'col-resize-handle';
            handle.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:'+EDGE+'px;cursor:col-resize;z-index:9999;background:transparent;';
            if (getComputedStyle(th).position === 'static') th.style.position = 'relative';

            let startX, startWidth;

            const onDown = (e) => {
                e.preventDefault();
                startX = e.pageX;
                startWidth = th.offsetWidth;
                document.body.style.userSelect = 'none';
                const onMove = (ev) => { th.style.width = Math.max(50, startWidth + (ev.pageX - startX)) + 'px'; };
                const onUp = () => {
                    document.body.style.userSelect = '';
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    if (tableEl.querySelector('.sticky-col')) updateStickyColLeft(tableEl);
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            };

            handle.addEventListener('pointerdown', onDown);
            th.appendChild(handle);
        });

        requestAnimationFrame(() => {
            let totalW = 0;
            tableEl.querySelectorAll('thead th').forEach(th => {
                const w = th.offsetWidth;
                if (w > 0) { th.style.width = w + 'px'; totalW += w; }
            });
            if (totalW > 0) tableEl.style.tableLayout = 'fixed';
            tableEl.querySelectorAll('.sticky-col').length && updateStickyColLeft(tableEl);
        });
    },
};

function updateStickyColLeft(table) {
    if (!table) return;
    const headers = table.querySelectorAll('thead th.sticky-col');
    let left = 0;
    headers.forEach(th => {
        th.style.left = left + 'px';
        const idx = Array.from(th.parentElement.children).indexOf(th);
        table.querySelectorAll('tbody tr').forEach(tr => {
            const td = tr.children[idx];
            if (td) td.style.left = left + 'px';
        });
        left += th.offsetWidth;
    });
}

/* ─── State ─── */
let currentView = 'dashboard';
let viewData = {};
let autoSync = true; // sincronização automática após cada CRUD

/* ─── Boot ─── */
// Auth init happens inline; full boot is at INIT at end of file

function atualizarInterfaceUsuario() {
  const nomeEl = document.getElementById('userDisplayName');
  const roleEl = document.getElementById('userDisplayRole');
  const adminOnlyBtns = ['btnGerenciarAcessos'];
  const isAdmin = STA_Auth.canManageUsers();

  adminOnlyBtns.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (isAdmin) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });

  if (STA_Auth.isAnonymous) {
    nomeEl.textContent = 'Anônimo';
    roleEl.textContent = 'Acesso limitado';
  } else if (STA_Auth.currentUser) {
    nomeEl.textContent = STA_Auth.currentUser.username;
    roleEl.textContent = STA_Auth.getRoleLabel();
  }

  // Atualizar botões do nav conforme permissão
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    const view = btn.dataset.view;
    if (STA_Auth.canAccess(view)) {
      btn.classList.remove('disabled');
      btn.classList.remove('hidden');
      btn.disabled = false;
    } else {
      btn.classList.add('disabled');
      btn.classList.add('hidden');
      btn.disabled = true;
    }
  });

  // Esconder seções vazias
  document.querySelectorAll('.nav-section').forEach(section => {
    let next = section.nextElementSibling;
    let hasVisible = false;
    while (next && next.classList.contains('nav-btn')) {
      if (!next.classList.contains('hidden')) {
        hasVisible = true;
        break;
      }
      next = next.nextElementSibling;
    }
    if (hasVisible) section.classList.remove('hidden');
    else section.classList.add('hidden');
  });
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  if (!sidebar || !toggleBtn) return;

  const isExpanded = localStorage.getItem('sidebarExpanded') === 'true';
  if (isExpanded) sidebar.classList.add('expanded');

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('expanded');
    localStorage.setItem('sidebarExpanded', sidebar.classList.contains('expanded'));
  });
}

/* ─── Login Handlers ─── */

function initNavButtons() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
}

function initLoginUI() {
  const loginBtn = document.getElementById('loginBtn');
  const anonBtn = document.getElementById('loginBtnAnon');
  const loginTab = document.getElementById('loginTabLogin');
  const anonTab = document.getElementById('loginTabAnon');
  const loginArea = document.getElementById('loginFormArea');
  const anonArea = document.getElementById('anonFormArea');
  const errorEl = document.getElementById('loginError');

  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    anonTab.classList.remove('active');
    loginArea.classList.remove('hidden');
    anonArea.classList.add('hidden');
    errorEl.classList.add('hidden');
  });

  anonTab.addEventListener('click', () => {
    anonTab.classList.add('active');
    loginTab.classList.remove('active');
    loginArea.classList.add('hidden');
    anonArea.classList.remove('hidden');
    errorEl.classList.add('hidden');
  });

  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;

    if (!username || !password) {
      errorEl.textContent = 'Preencha usuário e senha.';
      errorEl.classList.remove('hidden');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    errorEl.classList.add('hidden');

    try {
      await STA_Auth.login(username, password);
      await DB.init();
      document.getElementById('loginOverlay').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initNavButtons();
      initSidebar();
      atualizarInterfaceUsuario();
      const firstView = ['dashboard', 'militares', 'pcpd', 'uploadNc', 'missoes', 'ncs'].find(v => STA_Auth.canAccess(v)) || 'militares';
      navigate(firstView);
      toast('Bem-vindo, ' + STA_Auth.getRoleLabel() + '!');
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  });

  anonBtn.addEventListener('click', () => {
    errorEl.classList.add('hidden');
    STA_Auth.anonymousLogin();
  });

  // Enter key on password field
  document.getElementById('loginPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
  document.getElementById('loginUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
}

/* ─── OM/Seção options (deve bater com o dropdown) ─── */
const OM_OPTIONS = [
    'Cmdo Bda Inf Amv',
    '6° BI Amv',
    '12ª Cia Com Amv',
    'Cia C',
    '2ª Cia Prec',
    '12° Pel PE Amv',
];

/* ─── Navigation ─── */
function navigate(view) {
    if (!STA_Auth.canAccess(view)) {
        toast('Acesso restrito a esta funcionalidade.', 'error');
        return;
    }
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const titles = { dashboard: 'Dashboard', pcpd: 'Upload PCPD', criarPcpd: 'Criar PCPD', uploadNc: 'Upload NOTA DE CRÉDITO', missoes: 'Missões', militares: 'Militares', ncs: 'Notas de Crédito' };
    document.getElementById('viewTitle').textContent = titles[view] || 'STA';
    renderView(view);
}

// Logout / Gerenciar Acessos
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnLogout').addEventListener('click', function() {
        if (confirm('Deseja realmente sair?')) STA_Auth.logout();
    });
    document.getElementById('btnGerenciarAcessos').addEventListener('click', abrirGestaoUsuarios);
});

function renderView(view) {
    const content = document.getElementById('content');
    if (view === 'dashboard') renderDashboard(content);
    else if (view === 'pcpd') renderPcpd(content);
    else if (view === 'criarPcpd') renderCriarPcpd(content);
    else if (view === 'uploadNc') renderUploadNc(content);
    else if (view === 'missoes') renderMissoes(content);
    else if (view === 'militares') renderMilitares(content);
    else if (view === 'ncs') renderNcs(content);
}

/* ─── Toast ─── */
function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    setTimeout(() => el.classList.add('hidden'), 3000);
}

/* ─── Modal helpers ─── */
function openModal(html, wide) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    content.className = 'modal-content' + (wide ? ' wide' : '');
    modal.classList.remove('hidden');
    document.querySelector('.modal-backdrop').onclick = closeModal;
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* ─── Auto-sync helper ─── */
async function autoExportar() {
    if (!autoSync) return;
    if (!DB.googleSheets.WEBAPP_URL) return;
    try { await DB.googleSheets.exportar(); } catch (_) {}
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */
const DASH_COLORS = {
    alerta: { from: '#2563eb', to: '#1e40af' },
    atraso: { from: '#f59e0b', to: '#d97706' },
    critico: { from: '#dc2626', to: '#991b1b' },
    futuro: { from: '#059669', to: '#065f46' },
    info: { from: '#6366f1', to: '#4338ca' },
    financeiro: { from: '#0891b2', to: '#0e7490' },
};

function renderGradientCard(label, value, colors, extra) {
    return `<div class="card-gradient" style="background:linear-gradient(135deg,${colors.from},${colors.to})">
        <div class="card-gradient-title">${label}</div>
        <div class="card-gradient-value">${value}</div>
        ${extra || ''}
    </div>`;
}

function renderMiniTable(headers, rows, colKey) {
    if (!rows || rows.length === 0) return '<div class="dash-empty">Nenhum registro.</div>';
    return `<div class="dash-table-wrap"><table class="dash-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${colKey.map(k => {
            let val = r[k] ?? '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) val = U.fmtDateBR(val);
            return `<td>${val}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

function renderBar(items, max) {
    if (!items || items.length === 0) return '<div class="dash-empty">Nenhum dado.</div>';
    return items.map(([label, count]) => {
        const pct = max > 0 ? (count / max) * 100 : 0;
        return `<div class="bar-row"><span class="bar-label">${U.escape(label)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
            <span class="bar-count">${count}</span></div>`;
    }).join('');
}

function renderDashboard(el) {
    const d = DB.dashboard();
    const maxOM = d.missoes_por_om.length > 0 ? Math.max(...d.missoes_por_om.map(x => x[1])) : 1;
    const maxMes = d.missoes_por_mes.length > 0 ? Math.max(...d.missoes_por_mes.map(x => x[1])) : 1;
    const maxFase = Object.keys(d.fases_processo).length > 0 ? Math.max(...Object.values(d.fases_processo)) : 1;

    el.innerHTML = `
        <!-- ROW 1: Alert Cards -->
        <div class="dash-section-label">Painel de Controle</div>
        <div class="dash-alert-grid">
            ${renderGradientCard('Em Andamento', d.em_andamento, DASH_COLORS.alerta)}
            ${renderGradientCard('Relatórios Atrasados', d.relatorios_atrasados, DASH_COLORS.atraso,
                d.relatorios_atrasados > 0 ? `<div class="card-gradient-sub">${d.relatorios_muito_atrasados} muito atrasados</div>` : '')}
            ${renderGradientCard('Críticos (+30d)', d.relatorios_muito_atrasados, DASH_COLORS.critico)}
            ${renderGradientCard('Próximos 30 Dias', d.proximas_missoes_count, DASH_COLORS.futuro)}
        </div>

        <!-- ROW 2: Stat Cards -->
        <div class="dash-section-label">Visão Geral</div>
        <div class="dash-stat-grid">
            <div class="card"><div class="card-title">Total de Missões</div>
                <div class="card-value info">${d.total_missoes}</div></div>
            <div class="card"><div class="card-title">Total de NCs</div>
                <div class="card-value warning">${d.total_ncs}</div></div>
            <div class="card"><div class="card-title">Total de Militares</div>
                <div class="card-value success">${d.total_militares}</div></div>
            <div class="card"><div class="card-title">Valor Total NCs</div>
                <div class="card-value">${U.fmtBRL(d.valor_total_nc)}</div></div>
            <div class="card"><div class="card-title">Valor Utilizado</div>
                <div class="card-value">${U.fmtBRL(d.valor_total_utilizado)}</div></div>
            <div class="card"><div class="card-title">Saldo Disponível</div>
                <div class="card-value" style="color:${d.saldo_total_nc > 0 ? 'var(--success)' : 'var(--danger)'}">${U.fmtBRL(d.saldo_total_nc)}</div></div>
        </div>

        <!-- ROW 3: Distributions -->
        <div class="dash-section-label">Distribuições</div>
        <div class="dash-dist-grid">
            <div class="card">
                <div class="card-title">Missões por OM</div>
                <div class="dash-bars">${renderBar(d.missoes_por_om, maxOM)}</div>
            </div>
            <div class="card">
                <div class="card-title">Missões por Mês</div>
                <div class="dash-bars">${renderBar(d.missoes_por_mes, maxMes)}</div>
            </div>
            <div class="card">
                <div class="card-title">Fase do Processo</div>
                ${Object.keys(d.fases_processo).length > 0 ?
                    Object.entries(d.fases_processo).sort((a,b) => b[1]-a[1]).map(([fase, cnt]) => {
                        const pct = (cnt / maxFase) * 100;
                        return `<div class="bar-row"><span class="bar-label">${U.escape(fase)}</span>
                            <div class="bar-track"><div class="bar-fill bar-fill-phase" style="width:${pct}%"></div></div>
                            <span class="bar-count">${cnt}</span></div>`;
                    }).join('') :
                    '<div class="dash-empty">Nenhum dado.</div>'}
            </div>
            <div class="card">
                <div class="card-title">Situação do Relatório</div>
                ${Object.keys(d.missoes_por_situacao).length > 0 ?
                    Object.entries(d.missoes_por_situacao).sort((a,b) => b[1]-a[1]).map(([sit, cnt]) => {
                        const cor = sit === 'FINALIZADO' ? '#16a34a' :
                            sit === 'EM ANDAMENTO' ? '#2563eb' :
                            sit === 'CANCELADO' || sit === 'RECOLHIDA' ? '#dc2626' : '#f59e0b';
                        return `<div class="situacao-chip"><span class="situacao-dot" style="background:${cor}"></span>
                            ${U.escape(sit)} <strong>${cnt}</strong></div>`;
                    }).join('') :
                    '<div class="dash-empty">Nenhum dado.</div>'}
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                    <div class="card-title" style="margin-bottom:6px">Prazo de Entrega</div>
                    ${Object.keys(d.prazo_entrega).length > 0 ?
                        Object.entries(d.prazo_entrega).map(([p, cnt]) =>
                            `<div class="situacao-chip"><span class="situacao-dot" style="background:${p === 'ENTREGOU DENTRO DO PRAZO' ? '#16a34a' : p === 'ENTREGOU FORA DO PRAZO' ? '#dc2626' : '#94a3b8'}"></span>
                            ${U.escape(p)} <strong>${cnt}</strong></div>`
                        ).join('') :
                        '<div style="color:var(--text-muted);font-size:13px">Nenhum registro.</div>'}
                </div>
            </div>
        </div>

        <!-- ROW 4: Tables -->
        <div class="dash-section-label">Detalhamento</div>
        <div class="dash-table-grid">
            <div class="card">
                <div class="card-title" style="color:var(--danger)">🔴 Relatórios Pendentes</div>
                ${renderMiniTable(['Posto', 'Nome Guerra', 'OM', 'Fim Missão', 'Dias'],
                    d.relatorios_pendentes_lista,
                    ['posto_grad', 'nome_guerra', 'om_secao', 'data_final_missao', 'dias_corridos_sem_relatorio'])}
            </div>
            <div class="card">
                <div class="card-title" style="color:var(--info)">🔵 Próximas Missões</div>
                ${renderMiniTable(['Posto', 'Nome Guerra', 'OM', 'Início', 'Operação'],
                    d.proximas_missoes_lista,
                    ['posto_grad', 'nome_guerra', 'om_secao', 'data_inicio_missao', 'missao_operacao'])}
            </div>
            <div class="card">
                <div class="card-title" style="color:var(--success)">🟢 Missões Recentes</div>
                ${renderMiniTable(['Posto', 'Nome Guerra', 'OM', 'Início', 'Situação'],
                    d.missoes_recentes,
                    ['posto_grad', 'nome_guerra', 'om_secao', 'data_inicio_missao', 'situacao_relatorio'])}
            </div>
        </div>
    `;
}

/* ═══════════════════════════════════════════════════════════
   CRIAR PCPD (FORMULÁRIO)
   ═══════════════════════════════════════════════════════════ */
function renderCriarPcpd(el) {
    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const ano = hoje.getFullYear();

    el.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0">Gerar Documento PCPD</h3>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="gerarDocumentoPcpd()">
                        <span style="margin-right:8px">&#128190;</span> Gerar e Baixar .docx
                    </button>
                </div>
            </div>
            
            <form id="formCriarPcpd" class="form-grid">
                <!-- Seção 1: Militar -->
                <div class="full"><h4 style="margin:10px 0; color:var(--primary); border-bottom:1px solid var(--border)">Informações do Militar</h4></div>
                <div class="form-group">
                    <label>Posto/Graduação</label>
                    <input type="text" name="posto_grad" placeholder="Ex: Cap, 1º Ten, Sgt" list="listaPostos">
                </div>
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="nome_completo" placeholder="Nome completo do militar">
                </div>
                <div class="form-group">
                    <label>Nome de Guerra</label>
                    <input type="text" name="nome_guerra" placeholder="Coloque seu nome de guerra.">
                </div>
                <div class="form-group">
                    <label>Data de Nascimento</label>
                    <input type="text" name="data_nascimento" placeholder="Ex: 15/05/1990">
                </div>
                <div class="form-group">
                    <label>CPF</label>
                    <input type="text" name="cpf" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" placeholder="email@eb.mil.br">
                </div>
                <div class="form-group">
                    <label>Celular</label>
                    <input type="text" name="celular" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label>Banco</label>
                    <input type="text" name="banco" placeholder="Ex: Banco do Brasil">
                </div>
                <div class="form-group">
                    <label>Agência</label>
                    <input type="text" name="agencia" placeholder="Ex: 1234-5">
                </div>
                <div class="form-group">
                    <label>Conta</label>
                    <input type="text" name="conta" placeholder="Ex: 12345-6">
                </div>

                <!-- Seção 2: Missão -->
                <div class="full"><h4 style="margin:20px 0 10px; color:var(--primary); border-bottom:1px solid var(--border)">Dados da Missão</h4></div>
                <div class="form-group">
                    <label>Nº PCPD</label>
                    <input type="text" name="nr_pcpd" placeholder="Ex: 123/24">
                </div>
                <div class="form-group">
                    <label>Evento/Operação <span class="info-circle" title="Escreva a atividade que vai participar">i</span></label>
                    <input type="text" name="evento" placeholder="Ex: Operação Ágata">
                </div>
                <div class="form-group">
                    <label>OM de Destino</label>
                    <input type="text" name="om" placeholder="Ex: 6º BI Amv" list="listaOMs">
                </div>
                <div class="form-group">
                    <label>Afastamento Sede <span class="info-circle" title="Escreva o nome/estado das cidades que passará até o trajeto final, NÃO escreva Caçapava-SP">i</span></label>
                    <input type="text" name="afastamento" placeholder="Ex: Brasília-DF x  Rio Branco-AC">
                </div>
                <div class="form-group">
                    <label>Destino <span class="info-circle" title="Escreva apenas o nome-estado do destino final da viagem">i</span></label>
                    <input type="text" name="destino" placeholder="Ex: Rio Branco-AC">
                </div>
                <div class="form-group full">
                    <label>Justificativa para viagem urgente (se for o caso) <span class="info-circle" title="Só preencha se for o caso">i</span></label>
                    <textarea name="justificativa" placeholder="Descreva o motivo do afastamento..."></textarea>
                </div>
                <div class="form-group">
                    <label>BI que publicou</label>
                    <input type="text" name="bi" placeholder="Ex: BI nº 123 de 10 OUT 24">
                </div>

                <!-- Seção 3: Datas e Valores -->
                <div class="full"><h4 style="margin:20px 0 10px; color:var(--primary); border-bottom:1px solid var(--border)">Datas e Valores</h4></div>
                <div class="form-group">
                    <label>Data Ida (Início Afastamento) <span class="info-circle" title="É o GDH (171000 JUN 26) do dia da viagem">i</span></label>
                    <input type="text" name="ida" placeholder="Ex: 211000 JUN 26">
                </div>
                <div class="form-group">
                    <label>Data Volta (Fim Afastamento) <span class="info-circle" title="É o GDH (201800 JUN 26) do retorno da viagem">i</span></label>
                    <input type="text" name="volta" placeholder="Ex: 211000 JUN 26">
                </div>
                <div class="form-group">
<label>Data Início Missão <span class="info-circle" title="É o GDH (180800 JUN 26) que começa a atividade">i</span></label>
                    <input type="text" name="inicio" placeholder="Ex: 211000 JUN 26">
                </div>
                <div class="form-group">
                    <label>Data Término Missão <span class="info-circle" title="É o GDH (191800 JUN 26) que a missão termina">i</span></label>
                    <input type="text" name="termino" placeholder="Ex: 211000 JUN 26">
                </div>
                <div class="form-group">
                    <label>Nº de Diárias</label>
                    <input type="text" name="nr_diaria" id="formPcpd_nr_diaria" placeholder="Ex: 3,5">
                </div>
                <div class="form-group">
                    <label>Nº de Dias</label>
                    <input type="number" name="nr_dias" id="formPcpd_nr_dias">
                </div>
                <div class="form-group">
                    <label>Valor Total de Diárias (R$)</label>
                    <input type="text" name="valor" id="formPcpd_valor" placeholder="Ex: 1.250,50">
                </div>
                <div class="form-group">
                    <label>Valor da Tarifa de Embarque (R$) <span class="info-circle" title="Preencha o valor de R$ 95,00, se for o caso">i</span></label>
                    <input type="text" name="valor_tarifa" placeholder="Ex: 95,00">
                </div>
                <div class="form-group">
                    <label>Qtd Cidades</label>
                    <input type="number" name="qtd_cidades" value="1">
                </div>
                <div class="form-group">
                    <label>NR Nota de Crédito</label>
                    <input type="text" name="nr_nota_credito" placeholder="Ex: 2026NC123456">
                </div>

                <!-- Seção 4: Checkboxes do Documento -->
                <div class="full"><h4 style="margin:20px 0 10px; color:var(--primary); border-bottom:1px solid var(--border)">Opções do Documento</h4></div>
                <div class="form-group full">
                    <label>2. Beneficiário</label>
                    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:4px">
                        <label class="checkbox-label"><input type="checkbox" name="cb_beneficiario_militar"> Militar</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_beneficiario_servidor_civil"> Servidor Civil</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_beneficiario_colaborador_eventual"> Colaborador Eventual</label>
                    </div>
                </div>
                <div class="form-group full">
                    <label>O militar ficará alojado em OM ou em outra pousada sem ônus:</label>
                    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:4px">
                        <label class="checkbox-label"><input type="checkbox" name="cb_alojamento_sim"> Sim</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_alojamento_nao"> Não</label>
                    </div>
                </div>
                <div class="form-group full">
                    <label>O militar utilizará veículo oficial:</label>
                    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:4px">
                        <label class="checkbox-label"><input type="checkbox" name="cb_veiculo_oficial_sim"> Sim</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_veiculo_oficial_nao"> Não</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_veiculo_oficial_em_parte"> Em parte da viagem</label>
                    </div>
                </div>
                <div class="form-group full">
                    <label>7. Categoria de transporte:</label>
                    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:4px">
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_rodoviario"> Rodoviário</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_aereo"> Aéreo</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_ferroviario"> Ferroviário</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_aquaviario"> Aquaviário</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_meios_proprios"> Meios Próprios</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_transporte_viatura_oficial"> Viatura Oficial</label>
                    </div>
                </div>
                <div class="form-group full">
                    <label>Precisará de conexões que exijam transporte conforme § 3º Art. 17, da Portaria n° 290:</label>
                    <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:4px">
                        <label class="checkbox-label"><input type="checkbox" name="cb_conexoes_sim"> Sim</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_conexoes_nao"> Não</label>
                        <label class="checkbox-label"><input type="checkbox" name="cb_conexoes_veiculo_oficial"> com Veículo Oficial</label>
                    </div>
                </div>

                <!-- Seção 5: Requisitante e Assinatura -->
                <div class="full"><h4 style="margin:20px 0 10px; color:var(--primary); border-bottom:1px solid var(--border)">Assinatura e Data</h4></div>
                <div class="form-group">
                    <label>Nome Requisitante</label>
                    <input type="text" name="nome_requisitante" placeholder="Nome de quem assina">
                </div>
                <div class="form-group">
                    <label>Posto/Grad Requisitante</label>
                    <input type="text" name="posto_grad_requisitante" placeholder="Ex: Cel">
                </div>
                <div class="form-group">
                    <label>Função Requisitante</label>
                    <input type="text" name="funcao_requisitante" placeholder="Ex: Ordenador de Despesas">
                </div>
                <div class="form-group">
                    <label>Data do Documento</label>
                    <input type="date" name="data_documento" value="${hoje.toISOString().split('T')[0]}">
                </div>
                
                <!-- Hidden fields or placeholders specific to the doc -->
                <input type="hidden" name="NC01" value="">
                <input type="hidden" name="não_é_o_caso" value="Não é o caso">
            </form>
        </div>

        <datalist id="listaPostos">
            <option value="Gen Ex"></option>
            <option value="Gen Div"></option>
            <option value="Gen Bda"></option>
            <option value="Cel"></option>
            <option value="Ten Cel"></option>
            <option value="Maj"></option>
            <option value="Cap"></option>
            <option value="1º Ten"></option>
            <option value="2º Ten"></option>
            <option value="Asp"></option>
            <option value="S Ten"></option>
            <option value="1º Sgt"></option>
            <option value="2º Sgt"></option>
            <option value="3º Sgt"></option>
            <option value="Cb"></option>
            <option value="Sd"></option>
        </datalist>
        <datalist id="listaOMs">
            ${OM_OPTIONS.map(om => `<option value="${om}">`).join('')}
        </datalist>
    `;

    // Listeners para auto-extenso
     const form = document.getElementById('formCriarPcpd');
     
     const updateCalculos = () => {
         const ida = form.querySelector('[name="ida"]').value;
         const volta = form.querySelector('[name="volta"]').value;
         
         if (ida && volta) {
             const dIda = new Date(ida);
             const dVolta = new Date(volta);
             const diffTime = Math.abs(dVolta - dIda);
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             
             form.querySelector('#formPcpd_nr_dias').value = diffDays;
             // Valor padrão de diárias costuma ser n-1 ou n dependendo da regra, 
             // mas vamos deixar o usuário ajustar. Frequentemente é o mesmo que dias de afastamento.
             form.querySelector('#formPcpd_nr_diaria').value = diffDays;
         }
     };

     form.querySelector('[name="ida"]').addEventListener('change', updateCalculos);
      form.querySelector('[name="volta"]').addEventListener('change', updateCalculos);

      // Máscara de data (dd/mm/aaaa) — autocompleta as barras
      const dtNasc = form.querySelector('[name="data_nascimento"]');
      if (dtNasc) {
          dtNasc.addEventListener('input', function(e) {
              const typedSlash = e && e.inputType === 'insertText' && e.data === '/';
              if (typedSlash) return; // respeita barra digitada manualmente
              const v = this.value.replace(/\D/g, '').slice(0, 8);
              let formatted = '';
              if (v.length > 0) formatted += v.slice(0, 2);
              if (v.length > 2) formatted += '/' + v.slice(2, 4);
              if (v.length > 4) formatted += '/' + v.slice(4, 8);
              if (formatted && formatted !== this.value) this.value = formatted;
          });
      }
  }
 
  window.preencherDadosTestePcpd = function() {
     const form = document.getElementById('formCriarPcpd');
     if (!form) return;

     const dados = {
         posto_grad: 'Cap',
         nome_completo: 'JOSÉ DA SILVA OLIVEIRA',
         nome_guerra: 'SILVA',
         data_nascimento: '15/05/1990',
         cpf: '123.456.789-00',
         email: 'silva.jose@eb.mil.br',
         celular: '(12) 98765-4321',
         banco: 'Banco do Brasil',
         agencia: '1234-5',
         conta: '98765-4',
         nr_pcpd: '042/26',
         evento: 'Operação CORE 26',
         om: '12º BIL Amv',
         afastamento: 'De Caçapava-SP para Resende-RJ',
         destino: 'Resende-RJ',
         justificativa: 'Participar do adestramento conjunto com tropas aeromóveis para nivelamento de táticas e procedimentos em ambiente de montanha.',
         bi: 'BI nº 123 de 15 MAIO 26',
         ida: '2026-06-20',
         volta: '2026-06-25',
         inicio: '2026-06-21',
         termino: '2026-06-24',
         nr_diaria: '5',
         nr_dias: '5',
         valor: '1.250,50',
         valor_tarifa: '15,00',
         qtd_cidades: '1',
         nr_nota_credito: '2024NC00001',
         nome_requisitante: 'MARCOS ANTONIO DE SOUZA',
         posto_grad_requisitante: 'Cel',
         funcao_requisitante: 'Ordenador de Despesas',
         data_documento: '2026-06-20',
         // Checkboxes de exemplo
         cb_beneficiario_militar: true,
         cb_alojamento_nao: true,
         cb_veiculo_oficial_sim: true,
         cb_transporte_rodoviario: true,
         cb_conexoes_sim: true,
     };

     Object.keys(dados).forEach(key => {
         const field = form.querySelector(`[name="${key}"]`);
         if (!field) return;
         if (field.type === 'checkbox') {
             field.checked = !!dados[key];
         } else {
             field.value = dados[key];
         }
     });

     toast('Dados fictícios preenchidos para teste!');
  };
 
  async function gerarDocumentoPcpd() {
    const form = document.getElementById('formCriarPcpd');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Adicionar campos calculados (extensos)
    data['valor por extenso'] = U.valorPorExtenso(data.valor);
    data['diaria por extenso'] = U.numeroPorExtenso(Math.round(U.parseBRL(data.nr_diaria)));
    data['qtd cidades por extenso'] = U.numeroPorExtenso(parseInt(data.qtd_cidades) || 0);

    // Aliases: o formulário usa underscores, mas o template .docx usa espaços/maiúsculas
    // Tags do template: {{nr pcpd}}, {{nome completo}}, {{OM}}, {{posto/grad}}, {{cpf}},
    // {{banco}}, {{agencia}}, {{conta}}, {{email}}, {{telefone}}, {{celular}}, {{afastamento}},
    // {{ida}}, {{volta}}, {{bi}}, {{evento}}, {{inicio}}, {{termino}}, {{qtd cidades}},
    // {{qtd cidades por extenso}}, {{destino}}, {{nr dias}}, {{nr diaria}}, {{diaria por extenso}},
    // {{valor}}, {{valor tarifa}}, {{valor por extenso}}, {{justificativa}}, {{NC01}},
    // {{data documento}}, {{nome requisitante}}, {{posto grad requisitante}},
    // {{funcao requisitante}}, {{nome}}, {{posto}}, {{não é o caso}}
    data['posto/grad'] = data.posto_grad || '';
    data['nome completo'] = data.nome_completo || '';
    data['nr pcpd'] = data.nr_pcpd || '';
    data['qtd cidades'] = data.qtd_cidades || '';
    data['nr diaria'] = data.nr_diaria || '';
    data['nr dias'] = data.nr_dias || '';
    data['valor tarifa'] = U.fmtBRL(U.parseBRL(data.valor_tarifa));
    data['nome requisitante'] = data.nome_requisitante || '';
    data['posto grad requisitante'] = data.posto_grad_requisitante || '';
    data['funcao requisitante'] = data.funcao_requisitante || '';
    data['OM'] = data.om || '';
    data['telefone'] = data.celular || '';
    data['celular'] = data.celular || '';
    data['nome'] = data.nome_completo || '';
    data['posto'] = data.posto_grad || '';
    data['nao_e_o_caso'] = data['não_é_o_caso'] || 'Não é o caso';
    data['NC01'] = data['NC01'] || '';
    data['nr_nota_credito'] = data.nr_nota_credito || '';

    // Checkboxes do template (converter checked → ( x )  unchecked → (   ))
    const checkboxFields = [
      'cb_beneficiario_militar', 'cb_beneficiario_servidor_civil', 'cb_beneficiario_colaborador_eventual',
      'cb_alojamento_sim', 'cb_alojamento_nao',
      'cb_veiculo_oficial_sim', 'cb_veiculo_oficial_nao', 'cb_veiculo_oficial_em_parte',
      'cb_transporte_rodoviario', 'cb_transporte_aereo', 'cb_transporte_ferroviario', 'cb_transporte_aquaviario',
      'cb_transporte_meios_proprios', 'cb_transporte_viatura_oficial',
      'cb_conexoes_sim', 'cb_conexoes_nao', 'cb_conexoes_veiculo_oficial',
    ];
    if (form) {
      checkboxFields.forEach(name => {
        const el = form.querySelector(`[name="${name}"]`);
        data[name] = el && el.checked ? '( x )' : '(   )';
      });
    }
    // Gerar "data documento" no formato "Caçapava-SP, DD de mês de AAAA"
    const mesesPorExtenso = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const dd = data['data_documento'];
    if (dd) {
        const parts = dd.split('-');
        const dNum = parseInt(parts[2], 10);
        const mNum = parseInt(parts[1], 10) - 1;
        const yNum = parts[0];
        data['data documento'] = `Caçapava-SP, ${dNum} de ${mesesPorExtenso[mNum]} de ${yNum}`;
    } else {
        data['data documento'] = '';
    }
    // Manter aliases antigos para compatibilidade
    data['dia'] = dd ? parseInt(dd.split('-')[2], 10).toString() : '';
    data['mês'] = dd ? mesesPorExtenso[parseInt(dd.split('-')[1], 10) - 1] : '';
    data['mes'] = data['mês'];
    data['ano'] = dd ? dd.split('-')[0] : '';
    data['cpf'] = data['cpf'] || '';
    data['banco'] = data['banco'] || '';
    data['agencia'] = data['agencia'] || '';
    data['conta'] = data['conta'] || '';
    data['email'] = data['email'] || '';
    data['afastamento'] = data['afastamento'] || '';
    data['destino'] = data['destino'] || '';
    data['bi'] = data['bi'] || '';
    data['evento'] = data['evento'] || '';
    data['justificativa'] = data['justificativa'] || '';
    data['ida'] = data['ida'] || '';
    data['volta'] = data['volta'] || '';
    data['inicio'] = data['inicio'] || '';
    data['termino'] = data['termino'] || '';
    data['valor'] = U.fmtBRL(U.parseBRL(data['valor']));
    data['data nascimento'] = data.data_nascimento || data['data_nascimento'] || '';

    try {
        toast('Buscando modelo...', 'info');
        const response = await fetch('PCPD MODELO.docx');
        if (!response.ok) throw new Error('Não foi possível carregar o arquivo PCPD MODELO.docx');
        const content = await response.arrayBuffer();

        // Depuração de bibliotecas
        console.log('Verificando bibliotecas:', {
            PizZip: typeof window.PizZip,
            docxtemplater: typeof window.docxtemplater
        });

        // Tentar obter os construtores de diferentes formas comuns em CDNs
        const PizZipLib = window.PizZip;
        const DocxtemplaterLib = window.docxtemplater;

        if (!PizZipLib) {
            throw new Error('PizZip não encontrado. Verifique se o script foi carregado.');
        }
        if (!DocxtemplaterLib) {
            throw new Error('docxtemplater não encontrado. Verifique se o script foi carregado.');
        }

        const zip = new PizZipLib(content);

        // Helper para extrair mensagens de erro do docxtemplater
        function extractDocxErrors(err) {
            const msgs = [];
            if (err.properties && err.properties.errors && Array.isArray(err.properties.errors)) {
                err.properties.errors.forEach((e, i) => {
                    const parts = [];
                    if (e.message) parts.push(e.message);
                    if (e.properties) {
                        if (e.properties.explanation) parts.push(e.properties.explanation);
                        if (e.properties.id) parts.push('[id:' + e.properties.id + ']');
                        if (e.properties.rootError) parts.push('causa: ' + (e.properties.rootError.message || e.properties.rootError));
                        if (e.properties.offset !== undefined) parts.push('offset:' + e.properties.offset);
                        if (e.properties.x !== undefined) parts.push('x:' + e.properties.x);
                        if (e.properties.tag) parts.push('tag:' + e.properties.tag);
                    }
                    msgs.push('Erro ' + (i+1) + ': ' + parts.join(' | '));
                });
            } else {
                msgs.push(err.message || String(err));
            }
            return msgs;
        }

        let doc;
        try {
            doc = new DocxtemplaterLib(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function() { return ''; },
                delimiters: { start: '{{', end: '}}' }
            });
        } catch (buildError) {
            console.error('Erro ao construir docxtemplater:', buildError);
            const msgs = extractDocxErrors(buildError);
            msgs.forEach(m => console.error('  ' + m));
            throw new Error('Erro ao ler template: ' + msgs.join('; '));
        }

        // Preencher o documento
        try {
            doc.render(data);
        } catch (renderError) {
            console.error('Erro ao renderizar docxtemplater:', renderError);
            const msgs = extractDocxErrors(renderError);
            msgs.forEach(m => console.error('  ' + m));
            throw new Error('Erro ao preencher template: ' + msgs.join('; '));
        }

        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const fileName = `PCPD_${data.nome_guerra || 'Militar'}_${(data.nr_pcpd || 'Novo').replace(/\//g, '-')}.docx`;
        
        if (typeof window.saveAs === 'function') {
            window.saveAs(out, fileName);
        } else {
            // Fallback caso FileSaver falhe
            const link = document.createElement('a');
            link.href = URL.createObjectURL(out);
            link.download = fileName;
            link.click();
        }
        
        toast('Documento gerado com sucesso!');
    } catch (error) {
        console.error('Erro na geração do DOCX:', error);
        toast('Erro ao gerar documento: ' + error.message, 'error');
    }
}

/* ═══════════════════════════════════════════════════════════
   UPLOAD PCPD
   ═══════════════════════════════════════════════════════════ */
let pcpdDados = [];

const pcpdMilCols = [
    { id: 'posto_grad', label: 'Posto/Grad' },
    { id: 'nome', label: 'Nome Completo' },
    { id: 'nome_guerra', label: 'Nome de Guerra' },
    { id: 'om', label: 'OM' },
    { id: 'cpf', label: 'CPF' },
    { id: 'data_nascimento', label: 'Data Nasc.' },
    { id: 'email', label: 'Email' },
    { id: 'telefone', label: 'Telefone' },
];

const pcpdMisCols = [
    { id: 'numero_proposta', label: 'Nº Proposta' },
    { id: 'evento', label: 'Evento' },
    { id: 'destino', label: 'Destino' },
    { id: 'afastamento_sede', label: 'Afastamento da Sede' },
    { id: 'ida_gdh', label: 'Ida (GDH)' },
    { id: 'volta_gdh', label: 'Volta (GDH)' },
    { id: 'inicio_gdh', label: 'Início (GDH)' },
    { id: 'termino_gdh', label: 'Término (GDH)' },
    { id: 'nr_diarias', label: 'NR Diárias' },
    { id: 'nr_dias', label: 'NR Dias' },
    { id: 'valor', label: 'Valor Diárias' },
    { id: 'valor_tarifa', label: 'Tarifa Embarque' },
    { id: 'nr_nota_credito', label: 'NC' },
];

function renderPcpd(el) {
    el.innerHTML = `
        <div class="pcpd-container">
            <div class="pcpd-dropzone" id="pcpdDropzone">
                <div class="pcpd-dropzone-icon">&#128196;</div>
                <div class="pcpd-dropzone-text">Arraste os arquivos PCPD aqui<br><span>PDF ou Word (.pdf, .doc, .docx)</span></div>
                <div class="pcpd-dropzone-or">ou</div>
                <button class="btn btn-secondary" onclick="document.getElementById('pcpdFileInput').click()">Selecionar Arquivos</button>
                <input type="file" id="pcpdFileInput" accept=".pdf,.doc,.docx" multiple style="display:none">
                <div class="pcpd-file-info hidden" id="pcpdFileInfo">
                    <span id="pcpdFileCount"></span>
                    <button class="btn-icon danger" onclick="limparArquivosPcpd()" title="Remover">&#10005;</button>
                </div>
            </div>
            <button class="btn btn-disabled" id="btnExtrairDados" disabled>Extrair dados</button>
            <div id="pcpdTablesArea"></div>
        </div>`;

    const dropzone = document.getElementById('pcpdDropzone');
    const fileInput = document.getElementById('pcpdFileInput');
    const btnExtrair = document.getElementById('btnExtrairDados');
    let currentFiles = [];

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ['pdf', 'doc', 'docx'].includes(ext);
        });
        if (files.length === 0) { toast('Formato não suportado. Use PDF ou Word.', 'error'); return; }
        currentFiles = files;
        atualizarInfoArquivos(files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        currentFiles = Array.from(e.target.files);
        atualizarInfoArquivos(currentFiles);
    });

    function atualizarInfoArquivos(files) {
        document.getElementById('pcpdFileInfo').classList.remove('hidden');
        document.getElementById('pcpdFileCount').textContent = files.length + ' arquivo(s) selecionado(s)';
        btnExtrair.disabled = false;
        btnExtrair.className = 'btn btn-primary';
    }

    btnExtrair.addEventListener('click', async () => {
        if (currentFiles.length === 0) return;
        btnExtrair.disabled = true;
        btnExtrair.textContent = 'Extraindo...';
        let sucesso = 0;
        for (const file of currentFiles) {
            try {
                const result = await extrairTextoArquivo(file, (msg) => {
                    btnExtrair.textContent = msg;
                });
                const texto = typeof result === 'string' ? result : result.texto;
                console.log('=== RAW TEXT [' + file.name + '] ===');
                console.log(texto);
                console.log('=== END RAW TEXT ===');
                const campos = extrairDadosPcpd(texto);
                if (typeof result !== 'string' && result.nomeGuerra) {
                    campos.nome_guerra = result.nomeGuerra;
                }
                console.log('=== EXTRACTED FIELDS ===');
                console.log(JSON.stringify(campos, null, 2));
                campos._arquivo = file.name;
                pcpdDados.push(campos);
                sucesso++;
            } catch (err) {
                toast('Erro em ' + file.name + ': ' + err.message, 'error');
            }
        }
        renderPcpdTabelas();
        limparArquivosPcpd();
        btnExtrair.textContent = 'Extrair dados';
        toast(sucesso + '/' + currentFiles.length + ' arquivo(s) processado(s).');
        currentFiles = [];
    });

    renderPcpdTabelas();
}

function renderPcpdTabelas() {
    const area = document.getElementById('pcpdTablesArea');
    if (!area) return;

    area.innerHTML = `
        <h3 class="pcpd-table-title">Militares <span class="pcpd-count">${pcpdDados.length} registro(s)</span></h3>
        <div class="table-wrap">
            <table class="pcpd-table" id="pcpdTabelaMil">
                <thead><tr>${pcpdMilCols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                <tbody id="pcpdTbodyMil">
                    ${pcpdDados.map((d, i) => `
                        <tr>${pcpdMilCols.map(c => `<td contenteditable="true" data-row="${i}" data-col="${c.id}" data-tabela="mil">${U.escape(d[c.id] || '')}</td>`).join('')}</tr>
                    `).join('')}
                    ${pcpdDados.length === 0 ? '<tr><td colspan="5" class="empty-msg">Nenhum PCPD processado ainda</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        <h3 class="pcpd-table-title">Missões (PCPD) <span class="pcpd-count">${pcpdDados.length} registro(s)</span></h3>
        <div class="table-wrap">
            <table class="pcpd-table" id="pcpdTabelaMis">
                <thead><tr>${pcpdMisCols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                <tbody id="pcpdTbodyMis">
                    ${pcpdDados.map((d, i) => `
                        <tr>${pcpdMisCols.map(c => `<td contenteditable="true" data-row="${i}" data-col="${c.id}" data-tabela="mis">${U.escape(d[c.id] || '')}</td>`).join('')}</tr>
                    `).join('')}
                    ${pcpdDados.length === 0 ? '<tr><td colspan="7" class="empty-msg">Nenhum PCPD processado ainda</td></tr>' : ''}
                </tbody>
            </table>
        </div>
        ${pcpdDados.length > 0 ? '<button class="btn btn-primary" id="btnPreencherMissoes" onclick="preencherTabelaMissoes()">Preencher Tabela Missões</button>' : ''}`;

    area.querySelectorAll('table').forEach(t => U.enableColResize(t));

    document.querySelectorAll('#pcpdTbodyMil td[contenteditable], #pcpdTbodyMis td[contenteditable]').forEach(td => {
        td.addEventListener('blur', function() {
            const row = parseInt(this.dataset.row);
            const col = this.dataset.col;
            const val = this.textContent.trim();
            if (pcpdDados[row]) {
                pcpdDados[row][col] = val;
            }
        });
    });
}

const postoMap = {
    'marechal': 'Marechal', 'general de exercito': 'General de Exército',
    'general de exército': 'General de Exército', 'general de exercício': 'General de Exército',
    'general de divisao': 'General de Divisão', 'general de divisão': 'General de Divisão',
    'general de brigada': 'General de Brigada', 'coronel': 'Coronel', 'cel': 'Coronel',
    'tenente coronel': 'Tenente-Coronel', 'ten cel': 'Tenente-Coronel', 'tc': 'Tenente-Coronel',
    'major': 'Major', 'capitao': 'Capitão', 'capitão': 'Capitão', 'cap': 'Capitão',
    'primeiro tenente': 'Primeiro-Tenente', '1 tenente': 'Primeiro-Tenente',
    '1° tenente': 'Primeiro-Tenente', '1º tenente': 'Primeiro-Tenente',
    '1 ten': 'Primeiro-Tenente', '1° ten': 'Primeiro-Tenente', '1º ten': 'Primeiro-Tenente',
    'segundo tenente': 'Segundo-Tenente', '2 tenente': 'Segundo-Tenente',
    '2° tenente': 'Segundo-Tenente', '2º tenente': 'Segundo-Tenente',
    '2 ten': 'Segundo-Tenente', '2° ten': 'Segundo-Tenente', '2º ten': 'Segundo-Tenente',
    'aspirante': 'Aspirante a Oficial', 'cadete': 'Cadete',
    'subtenente': 'Subtenente', 'sub tenente': 'Subtenente', 'sub ten': 'Subtenente',
    'primeiro sargento': 'Primeiro-Sargento', '1 sargento': 'Primeiro-Sargento',
    '1° sargento': 'Primeiro-Sargento', '1º sargento': 'Primeiro-Sargento',
    '1 sgt': 'Primeiro-Sargento', '1° sgt': 'Primeiro-Sargento', '1º sgt': 'Primeiro-Sargento',
    'segundo sargento': 'Segundo-Sargento', '2 sargento': 'Segundo-Sargento',
    '2° sargento': 'Segundo-Sargento', '2º sargento': 'Segundo-Sargento',
    '2 sgt': 'Segundo-Sargento', '2° sgt': 'Segundo-Sargento', '2º sgt': 'Segundo-Sargento',
    '2 set': 'Segundo-Sargento', '2° set': 'Segundo-Sargento', '2º set': 'Segundo-Sargento',
    'terceiro sargento': 'Terceiro-Sargento', '3 sargento': 'Terceiro-Sargento',
    '3° sargento': 'Terceiro-Sargento', '3º sargento': 'Terceiro-Sargento',
    '3 sgt': 'Terceiro-Sargento', '3° sgt': 'Terceiro-Sargento', '3º sgt': 'Terceiro-Sargento',
    'cabo': 'Cabo', 'cb': 'Cabo', 'soldado': 'Soldado', 'sd': 'Soldado',
};

function mapearPosto(valor) {
    if (!valor) return '';
    const chave = valor.toLowerCase().replace(/[°º]/g, '°').replace(/\s+/g, ' ').trim();
    const encontrado = Object.keys(postoMap).find(k => chave.includes(k));
    return encontrado ? postoMap[encontrado] : valor;
}

function normalizarOM(valor) {
    if (!valor) return '';
    const raw = valor.trim();
    const normalizado = raw
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[°ºª]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    let melhorMatch = '';
    let melhorScore = 0;

    for (const opt of OM_OPTIONS) {
        const optNorm = opt
            .toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[°ºª]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const palavrasOCR = normalizado.split(' ');
        const palavrasOpt = optNorm.split(' ');
        let score = 0;

        for (const p of palavrasOCR) {
            if (p.length < 2) continue;
            if (palavrasOpt.some(op => op.includes(p) || p.includes(op))) {
                score++;
            }
        }

        if (normalizado.includes(optNorm)) score += 5;
        if (optNorm.startsWith(palavrasOCR[0])) score += 3;
        if (optNorm === 'CIA C' && /\bCIA\s*C\b/i.test(raw)) score += 5;

        if (score > melhorScore) {
            melhorScore = score;
            melhorMatch = opt;
        }
    }

    return melhorMatch;
}

function detectarNacInt(local) {
    if (!local) return '';
    return /\([A-Za-zÀ-ÿ\s]+\)/.test(local) ? 'INTERNACIONAL' : 'NACIONAL';
}

function gdhParaData(gdh) {
    if (!gdh || gdh.length < 11) return null;
    const meses = { 'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12' };
    const mes = meses[gdh.slice(6, 9).toUpperCase()];
    if (!mes) return null;
    return '20' + gdh.slice(9, 11) + '-' + mes + '-' + gdh.slice(0, 2);
}

window.preencherTabelaMissoes = async function() {
    if (pcpdDados.length === 0) { toast('Nenhum dado PCPD para processar.', 'error'); return; }
    if (!confirm('Preencher tabelas com os dados do PCPD?')) return;

    let milCriados = 0, misCriadas = 0;

    for (const d of pcpdDados) {
        const posto = mapearPosto(d.posto_grad);
        const nomeComp = d.nome || '';
        const nomeGuerraRaw = d.nome_guerra || '';
        const nomeGuerra = nomeGuerraRaw || (nomeComp.split(/\s+/).length > 1 ? nomeComp.split(/\s+/).pop() : nomeComp) || nomeComp;
        const om = normalizarOM(d.om || '');

        const militarDados = { posto_grad: posto, nome_completo: nomeComp, nome_guerra: nomeGuerra, om_secao: om,
            cpf: d.cpf || '', data_nascimento: U.parseDateBR(d.data_nascimento), email: d.email || '', telefone: d.telefone || '' };
        const militar = await DB.militar.criar(militarDados);
        milCriados++;

        const missaoOp = d.evento || '';
        const item = DB.missao.proximoItem();
        const missaoDados = {
            item: item,
            missao_operacao: missaoOp,
            local: d.destino || d.afastamento_sede || '',
            nacional_internacional: detectarNacInt(d.destino || d.afastamento_sede),
            data_ida: gdhParaData(d.ida_gdh),
            data_retorno: gdhParaData(d.volta_gdh),
            data_inicio_missao: gdhParaData(d.inicio_gdh),
            data_final_missao: gdhParaData(d.termino_gdh),
            nr_diarias: parseInt(d.nr_diarias) || 0,
            pc_diarias: '100%',
            data_recebimento_processo: U.today(),
            militar_id: militar.id,
        };
        await DB.missao.criar(missaoDados);
        misCriadas++;
    }

    toast(milCriados + ' militar(es) criado(s), ' + misCriadas + ' missão(ões) criada(s).');

    pcpdDados = [];
    renderPcpdTabelas();
    autoExportar();
};

window.limparArquivosPcpd = function() {
    document.getElementById('pcpdFileInfo').classList.add('hidden');
    document.getElementById('pcpdFileCount').textContent = '';
    document.getElementById('pcpdFileInput').value = '';
    document.querySelector('.pcpd-dropzone-icon').textContent = '\uD83D\uDCC4';
    document.getElementById('btnExtrairDados').disabled = true;
    document.getElementById('btnExtrairDados').className = 'btn btn-disabled';
};

async function extrairTextoArquivo(file, onProgress) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let texto = '';
        let allItems = [];
        let nomeGuerra = null;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const items = content.items.sort((a, b) => {
                const yd = b.transform[5] - a.transform[5];
                return yd !== 0 ? Math.sign(yd) : a.transform[4] - b.transform[4];
            });
            allItems = allItems.concat(items);
            let lastY = null, lastX = null;
            for (const item of items) {
                const x = item.transform[4];
                const y = Math.round(item.transform[5]);
                if (lastY !== null && Math.abs(y - lastY) > 3) {
                    texto += '\n';
                } else if (lastX !== null && (x - lastX) > 4) {
                    texto += ' ';
                }
                texto += item.str;
                lastX = x + (item.width || item.str.length * 6);
                lastY = y;
            }
            texto += '\n';
        }

        const charsValidos = (texto.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
        if (charsValidos < 40) {
            if (onProgress) onProgress('PDF sem dados legíveis. Iniciando OCR...');
            texto = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                if (onProgress) onProgress('OCR: página ' + i + '/' + pdf.numPages);
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 4.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const { data } = await Tesseract.recognize(canvas, 'por');
                texto += data.text + '\n';
            }
            return { texto, nomeGuerra: null };
        }

        const temPcpd = /proposta|concess[ãa]o|gdh|passagens|di[áa]rias/i.test(texto);
        nomeGuerra = temPcpd ? extrairNomeGuerraNegrito(allItems) : null;
        return { texto, nomeGuerra };
    }
    if (['doc', 'docx'].includes(ext)) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const texto = new TextDecoder('utf-8').decode(bytes);
        return { texto, nomeGuerra: null };
    }
    throw new Error('Formato não suportado');
}

function detectarFonteBold(allItems) {
    const fontCounts = {};
    const headerFontCounts = {};

    for (const item of allItems) {
        const str = (item.str || '').trim();
        if (!str) continue;
        const fn = item.fontName;
        fontCounts[fn] = (fontCounts[fn] || 0) + 1;

        const isHeader = /^(?:MINIST|EXÉRC|COMAND|PROPOSTA|BENEFICI[ÁA]RIO|EVENTO|JUSTIFICATIVA|DI[ÁA]RIAS|CATEGORIA|[1-7][.º°\s])/i.test(str);
        if (isHeader) {
            headerFontCounts[fn] = (headerFontCounts[fn] || 0) + 1;
        }
    }

    let bestFont = null;
    let bestScore = 0;
    for (const fn of Object.keys(fontCounts)) {
        const headerCount = headerFontCounts[fn] || 0;
        const totalCount = fontCounts[fn] || 1;
        if (headerCount >= 2) {
            const score = headerCount / totalCount;
            if (score > bestScore) {
                bestScore = score;
                bestFont = fn;
            }
        }
    }
    return bestFont;
}

function extrairNomeGuerraNegrito(allItems) {
    const boldFont = detectarFonteBold(allItems);
    if (!boldFont) return null;

    const nomeLabelIdx = allItems.findIndex(it => /^N[oº]me/i.test(it.str));
    if (nomeLabelIdx < 0) return null;

    const nomeLabel = allItems[nomeLabelIdx];
    const nomeY = Math.round(nomeLabel.transform[5]);
    const nomeLabelEndX = nomeLabel.transform[4] + (nomeLabel.width || 0);

    const nomeLineItems = allItems.filter(it => {
        const y = Math.round(it.transform[5]);
        const x = it.transform[4];
        return Math.abs(y - nomeY) <= 3 && x > nomeLabelEndX - 1;
    });

    nomeLineItems.sort((a, b) => a.transform[4] - b.transform[4]);

    const partes = nomeLineItems.map(it => ({
        texto: it.str.replace(/\s+/g, ' '),
        isBold: it.fontName === boldFont
    })).filter(p => p.texto.trim().length > 0);

    const totalBold = partes.filter(p => p.isBold).length;
    const totalNaoBold = partes.filter(p => !p.isBold).length;

    if (totalNaoBold === 0 && totalBold > 1) return null;

    const guerra = partes.filter(p => p.isBold).map(p => p.texto.trim()).join(' ');
    return guerra || null;
}

function extrairDadosPcpd(texto) {
    const campos = {};

    function limparGDH(val) {
        val = val.replace(/\s+/g, '');
        val = val.replace(/[ªº]/g, c => c === 'ª' ? 'A' : 'O');
        val = val.toUpperCase();
        val = val.replace(/[^A-Z0-9]/g, '');
        const m = val.match(/(\d{6}[A-Z]{3}\d{2})/);
        return m ? m[1] : val;
    }

    function extrairGDH(labelRe) {
        const stop = 'V[oº]lt[aª]|In[ií]ci[oº]|T[eé]rmin[oº]';
        const gdhOcr = '(?:\\([^)]*\\))?';
        const sep = '\\s*(?:[|\\-]\\s*)?';
        let re = new RegExp(labelRe + '\\s*' + gdhOcr + '\\s*:\\s*' + sep + '([^\\n]+?)(?=' + stop + '\\s*' + gdhOcr + '\\s*:|' + stop + '|\\n|$)', 'i');
        let m = texto.match(re);
        if (m) return limparGDH(m[1]);
        const linhas = texto.split('\n');
        const idx = linhas.findIndex(l => new RegExp(labelRe + '\\s*:', 'i').test(l));
        if (idx >= 0) {
            const mesmaLinhaGDH = linhas[idx].match(/(\d{6}[a-zA-Z]{3}\d{2})/);
            if (mesmaLinhaGDH) return limparGDH(mesmaLinhaGDH[1]);
            if (idx + 1 < linhas.length) {
                const proxLinha = linhas[idx + 1].trim();
                const gdhMatch = proxLinha.match(/(\d{6}[a-zA-Z]{3}\d{2})/);
                if (gdhMatch) return limparGDH(gdhMatch[1]);
            }
        }
        return null;
    }

    let m;

    m = texto.match(/n[º°]\s*(\d+\/\S+)/i);
    if (m) campos.numero_proposta = m[1];

    m = texto.match(/N[oº]me:\s*(.+?)(?=\s+(?:OM\s*[:;]|P[oº]st[oº]\/Gr[aª]d|E-mail|Banco|$))/i);
    if (m) campos.nome = m[1].trim();

    if (!campos.nome) {
        const linhas = texto.split('\n');
        const idxNome = linhas.findIndex(l => /N[oº]me\s*:/i.test(l));
        if (idxNome >= 0) {
            const mesmaLinha = linhas[idxNome].match(/N[oº]me\s*:\s*(.+)/i);
            if (mesmaLinha) campos.nome = mesmaLinha[1].trim();
            else if (idxNome + 1 < linhas.length) {
                campos.nome = linhas[idxNome + 1].trim();
            }
        }
    }

    if (!campos.nome_guerra && campos.nome) {
        const nomeSplit = campos.nome.split(/\s+/).filter(w => w.length > 0);
        campos.nome_guerra = nomeSplit.length > 1 ? nomeSplit[nomeSplit.length - 1] : nomeSplit[0];
    }

    m = texto.match(/OM\s*[:;]\s*(.+?)(?=\s+(?:P[oº]st[oº]\/Gr[aª]d|D[aª]t[aª]|Preencha|Banco|E-mail|$))/i);
    if (m) campos.om = m[1].trim().replace(/\s{2,}/g, ' ');

    m = texto.match(/P[oº]st[oº]\/Gr[aª]d:\s*([^\n\r]+?)(?=\s*(?:CPF[:\s]|Data\s*N[aª]s|[:\s]*\d{2}[/\-.]\d{2}[/\-.]\d{2,4}|OM[:\s]|Banco[:\s]|E-mail|\n|$))/i);
    if (m) {
        let postoGrad = m[1].trim();
        const mapeamentoPostoGrad = {
            'S Ten': 'Subtenente',
            'STEN': 'Subtenente', 
            'TC': 'Tenente Coronel',
            'Ten Cel': 'Tenente Coronel',
            'TENCEL': 'Tenente Coronel',
            'CEL': 'Coronel',
            'MAJ': 'Major',
            'CAP': 'Capitão',
            '1º Sgt': 'Primeiro-Sargento',
            '1° Sgt': 'Primeiro-Sargento',
            '2º Sgt': 'Segundo-Sargento',
            '2° Sgt': 'Segundo-Sargento',
            '3º Sgt': 'Terceiro-Sargento',
            '3° Sgt': 'Terceiro-Sargento',
            'ST': 'Soldado',
            'CB': 'Cabo'
        };
        postoGrad = postoGrad.replace(/[^\w\sºª°]/g, '').trim();
        postoGrad = postoGrad.replace(/\s+/g, ' ');
        const chaveMatch = postoGrad.toUpperCase();
        const encontrado = Object.keys(mapeamentoPostoGrad).find(k => chaveMatch.includes(k.toUpperCase()));
        campos.posto_grad = encontrado ? mapeamentoPostoGrad[encontrado] : postoGrad;
    }

    m = texto.match(/3\.?\s*A[fª][aª]st[aª]ment[oº]\s*d[aª]\s*sede:\s*([\s\S]*?)(?=\s*(?:Id[aª]\s*(?:\([^)]*\))?|B[iíIl]\s*(?:que\s*)?publicou))/i);
    if (m) campos.afastamento_sede = m[1].replace(/\s+/g, ' ').trim().replace(/\s*[xX]\s*/g, ' \u2716 ');

    campos.ida_gdh = extrairGDH('Id[aª]');
    campos.volta_gdh = extrairGDH('V[oº]lt[aª]');

    m = texto.match(/4\.?\s*Event[oº]:\s*([\s\S]*?)(?=\s*In[ií]ci[oº]\s*(?:\([^)]*\))?)/i);
    if (m) campos.evento = m[1].replace(/\s+/g, ' ').trim();

    campos.inicio_gdh = extrairGDH('In[ií]ci[oº]');
    campos.termino_gdh = extrairGDH('T[eé]rmin[oº]');

    // Fallback: se todos os 4 GDH estão vazios, tenta extrair por ordem posicional (aceita minúsculas)
    const todosGdh = [...texto.matchAll(/(\d{6}[a-zA-Z]{3}\d{2})/g)];
    if (!campos.ida_gdh && !campos.volta_gdh && !campos.inicio_gdh && !campos.termino_gdh && todosGdh.length >= 4) {
        campos.ida_gdh = todosGdh[0][1].toUpperCase();
        campos.volta_gdh = todosGdh[1][1].toUpperCase();
        campos.inicio_gdh = todosGdh[2][1].toUpperCase();
        campos.termino_gdh = todosGdh[3][1].toUpperCase();
    }

    m = texto.match(/N[º°]\s*de\s*di[áa]ri[ªa]s:\s*(\d+(?:[,.]\d+)?)/i);
    campos.nr_diarias = m ? m[1].replace(',', '.') : '';

    m = texto.match(/CPF\s*:\s*([\d]{3}\.[\d]{3}\.[\d]{3}[-—]\d{2})/i);
    if (m) campos.cpf = m[1].replace(/[—\-]/g, '-');
    if (!campos.cpf) {
        m = texto.match(/CPF\s*:\s*(\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s\-—]?\d{2})/i);
        if (m) campos.cpf = m[1].replace(/\s/g, '').replace(/\. /g, '.');
    }
    if (!campos.cpf) {
        m = texto.match(/CPF\s*:\s*(\d{11})/i);
        if (m) {
            const d = m[1];
            campos.cpf = d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9,11);
        }
    }

    m = texto.match(/(?:Data|Dt\.?)\s*Nasciment[oa]:\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
    if (m) campos.data_nascimento = m[1].replace(/-/g, '/');
    if (!campos.data_nascimento) {
        const linhas = texto.split('\n');
        const idxDtNasc = linhas.findIndex(l => /(?:Data|Dt\.?)\s*Nasciment[oa]\s*:/i.test(l));
        if (idxDtNasc >= 0) {
            const mesmaLinha = linhas[idxDtNasc].match(/:\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
            if (mesmaLinha) {
                campos.data_nascimento = mesmaLinha[1].replace(/-/g, '/');
            } else if (idxDtNasc + 1 < linhas.length) {
                const proxima = linhas[idxDtNasc + 1].trim();
                const mDt = proxima.match(/^(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
                if (mDt) campos.data_nascimento = mDt[1].replace(/-/g, '/');
            }
        }
    }

    // Email: tenta match na mesma linha primeiro (aceita OCR com E—mªil, E-mail etc.)
    m = texto.match(/E[—\-]\s*m[aª]il:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (!m) {
        const linhas = texto.split('\n');
        const idxEmail = linhas.findIndex(l => /E[—\-]\s*m[aª]il\s*:/i.test(l));
        if (idxEmail >= 0 && idxEmail + 1 < linhas.length) {
            const proxima = linhas[idxEmail + 1].trim();
            const emailMatch = proxima.match(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) m = [null, emailMatch[1]];
            // se não achou na linha seguinte, tenta na própria linha do label
            if (!m) {
                const mSameLine = linhas[idxEmail].match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                if (mSameLine) m = [null, mSameLine[1]];
            }
            // tenta com correção OCR (Q → @, º/ª → o/a)
            if (!m) {
                const corrigido = proxima.replace(/[º°]/g, 'o').replace(/[ªª]/g, 'a').replace(/Q/g, '@');
                const mCorrigido = corrigido.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                if (mCorrigido) m = [null, mCorrigido[1]];
            }
        }
    }
    if (m) campos.email = m[1];

    if (!campos.nr_dias) {
        m = texto.match(/N[º°]?\s*de\s*dias:\s*(\d+(?:[,.]\d+)?)/i);
        if (m) campos.nr_dias = m[1].replace(',', '.');
    }

    m = texto.match(/Localidade\s*de\s*destino:\s*([^\n\r.]+)/i);
    if (m) campos.destino = m[1].trim();

    m = texto.match(/tarifa\s*de\s*embarque[^:]*:\s*R\$\s*([\d.,]+)/i);
    if (m) campos.valor_tarifa = m[1].trim();

    m = texto.match(/Valor\s*Total\s*de\s*di[áa]rias:\s*R\$\s*([\d.,]+)/i);
    if (m) campos.valor = m[1].trim();

    m = texto.match(/Valor\s*total\s*a\s*receber:\s*R\$\s*([\d.,]+)/i);
    if (m && !campos.valor) campos.valor = m[1].trim();

    m = texto.match(/(\d{4}NC\d{6})/i);
    if (m) campos.nr_nota_credito = m[1].toUpperCase();

    const numeroTel = /\(?(\d{2})\)?\s*((?:\d\s?)?\d{4,5})\s*[—\-]?\s*(\d{4})/;
    m = texto.match(/Telef[oº]ne\s*Celul[aª]r:\s*\(?(\d{2})\)?\s*((?:\d\s?)?\d{4,5})\s*[—\-]?\s*(\d{4})/i);
    if (m) campos.telefone = '(' + m[1] + ') ' + m[2].replace(/\s/g, '') + '-' + m[3];
    else {
        const linhas = texto.split('\n');
        const idxTel = linhas.findIndex(l => /Telef[oº]ne\s*Celul[aª]r\s*:/i.test(l));
        if (idxTel >= 0) {
            const linhaLabel = linhas[idxTel];
            const telNaLinha = linhaLabel.match(numeroTel);
            if (telNaLinha) {
                campos.telefone = '(' + telNaLinha[1] + ') ' + telNaLinha[2].replace(/\s/g, '') + '-' + telNaLinha[3];
            } else if (idxTel + 1 < linhas.length) {
                const proxima = linhas[idxTel + 1].trim();
                const mTel = proxima.match(/^(\d{2})\s*'?(\d{4,5})\s*[-—]?\s*(\d{4})/);
                if (mTel) {
                    campos.telefone = '(' + mTel[1] + ') ' + mTel[2].replace(/\s/g, '') + '-' + mTel[3];
                } else {
                    const mTel2 = proxima.match(/^(\d{10,11})$/);
                    if (mTel2) {
                        const raw = mTel2[1];
                        campos.telefone = '(' + raw.slice(0,2) + ') ' + raw.slice(2, raw.length - 4) + '-' + raw.slice(-4);
                    }
                }
            }
        }
    }

    return campos;
}

/* ═══════════════════════════════════════════════════════════
   UPLOAD NOTA DE CRÉDITO
   ═══════════════════════════════════════════════════════════ */
let ncUploadDados = [];

const ncUploadCols = [
    { id: 'nr_nc', label: 'NC' },
    { id: 'original_ou_complemento', label: 'Orig/Comp' },
    { id: 'nd', label: 'ND' },
    { id: 'data_nc', label: 'Data NC' },
    { id: 'valor_nc', label: 'Valor NC' },
];

function renderUploadNc(el) {
    el.innerHTML = `
        <div class="pcpd-container">
            <div class="pcpd-dropzone" id="ncDropzone">
                <div class="pcpd-dropzone-icon">&#128203;</div>
                <div class="pcpd-dropzone-text">Arraste os arquivos de Nota de Crédito aqui<br><span>PDF (.pdf)</span></div>
                <div class="pcpd-dropzone-or">ou</div>
                <button class="btn btn-secondary" onclick="document.getElementById('ncFileInput').click()">Selecionar Arquivos</button>
                <input type="file" id="ncFileInput" accept=".pdf" multiple style="display:none">
                <div class="pcpd-file-info hidden" id="ncFileInfo">
                    <span id="ncFileCount"></span>
                    <button class="btn-icon danger" onclick="limparArquivosNc()" title="Remover">&#10005;</button>
                </div>
            </div>
            <button class="btn btn-disabled" id="btnExtrairNc" disabled>Extrair dados</button>
            <div id="ncTablesArea"></div>
        </div>`;

    const dropzone = document.getElementById('ncDropzone');
    const fileInput = document.getElementById('ncFileInput');
    const btnExtrair = document.getElementById('btnExtrairNc');
    let currentNcFiles = [];

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ext === 'pdf';
        });
        if (files.length === 0) { toast('Formato não suportado. Use PDF.', 'error'); return; }
        currentNcFiles = files;
        atualizarInfoArquivosNc(files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        currentNcFiles = Array.from(e.target.files);
        atualizarInfoArquivosNc(currentNcFiles);
    });

    function atualizarInfoArquivosNc(files) {
        document.getElementById('ncFileInfo').classList.remove('hidden');
        document.getElementById('ncFileCount').textContent = files.length + ' arquivo(s) selecionado(s)';
        btnExtrair.disabled = false;
        btnExtrair.className = 'btn btn-primary';
    }

    btnExtrair.addEventListener('click', async () => {
        if (currentNcFiles.length === 0) return;
        btnExtrair.disabled = true;
        btnExtrair.textContent = 'Extraindo...';
        let sucesso = 0, filesOk = 0;
        for (const file of currentNcFiles) {
            try {
                const result = await extrairTextoArquivo(file, (msg) => {
                    btnExtrair.textContent = msg;
                });
                const texto = typeof result === 'string' ? result : result.texto;
                console.log('=== RAW TEXT NC [' + file.name + '] ===');
                console.log(texto);
                const registros = extrairDadosNc(texto);
                console.log('=== EXTRACTED NC FIELDS ===');
                console.log(JSON.stringify(registros, null, 2));
                for (const r of registros) {
                    r._arquivo = file.name;
                    ncUploadDados.push(r);
                }
                sucesso += registros.length;
                filesOk++;
            } catch (err) {
                toast('Erro em ' + file.name + ': ' + err.message, 'error');
            }
        }
        renderNcUploadTabelas();
        limparArquivosNc();
        btnExtrair.textContent = 'Extrair dados';
        toast(filesOk + '/' + currentNcFiles.length + ' arquivo(s) processado(s), ' + sucesso + ' registro(s) extraído(s).');
        currentNcFiles = [];
    });

    renderNcUploadTabelas();
}

function renderNcUploadTabelas() {
    const area = document.getElementById('ncTablesArea');
    if (!area) return;

    area.innerHTML = `
        <h3 class="pcpd-table-title">NOTA DE CRÉDITO <span class="pcpd-count">${ncUploadDados.length} registro(s)</span></h3>
        <div class="table-wrap">
            <table class="pcpd-table" id="ncUploadTabela">
                <thead><tr>${ncUploadCols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                <tbody id="ncUploadTbody">
                    ${ncUploadDados.map((d, i) => `
                        <tr>
                            ${ncUploadCols.map(c => {
                                if (c.id === 'original_ou_complemento') {
                                    return `<td data-row="${i}" data-col="${c.id}">
                                        <select class="nc-upload-select" data-row="${i}" data-col="original_ou_complemento" onchange="ncUploadDados[${i}].original_ou_complemento=this.value">
                                            <option value="ORIGINAL" ${d.original_ou_complemento !== 'COMPLEMENTO' ? 'selected' : ''}>ORIGINAL</option>
                                            <option value="COMPLEMENTO" ${d.original_ou_complemento === 'COMPLEMENTO' ? 'selected' : ''}>COMPLEMENTO</option>
                                        </select>
                                    </td>`;
                                }
                                const valor = c.id === 'data_nc' ? U.fmtDateBR(d[c.id]) : c.id === 'valor_nc' ? U.fmtBRL(d[c.id]) : (d[c.id] || '');
                                return `<td contenteditable="true" data-row="${i}" data-col="${c.id}">${U.escape(valor)}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                    ${ncUploadDados.length === 0 ? '<tr><td colspan="5" class="empty-msg">Nenhuma NC processada ainda</td></tr>' : ''}
                </tbody>
            </table>
        </div>
        ${ncUploadDados.length > 0 ? '<button class="btn btn-primary" id="btnPreencherNcs" onclick="preencherTabelaNcs()">Preencher Tabela Notas de Crédito</button>' : ''}`;

    area.querySelectorAll('table').forEach(t => U.enableColResize(t));

    document.querySelectorAll('#ncUploadTbody td[contenteditable]').forEach(td => {
        td.addEventListener('blur', function() {
            const row = parseInt(this.dataset.row);
            const col = this.dataset.col;
            const val = this.textContent.trim();
            if (ncUploadDados[row]) {
                ncUploadDados[row][col] = val;
            }
        });
    });
}

function extrairDadosNc(texto) {
    const registros = [];
    let nrNc = '', dataNc = '';
    let m;

    const aposTitulo = texto.split('NOTA DE CRÉDITO ORÇAMENTÁRIO')[1];
    if (aposTitulo) {
        m = aposTitulo.match(/(\d{4}\s*NC\s*\d{6})(?!\d)/i);
    }
    if (!m) m = texto.match(/(\d{4}\s*NC\s*\d{6})(?!\d)/i);
    if (m) {
        nrNc = m[1].replace(/\s+/g, '').toUpperCase();
    }
    if (!nrNc) {
        const ncLabeled = texto.match(/N[°º]?\s*(?:C|T)[:\s\(]*(\d{4}\s*NC\s*\d{6})(?!\d)/i);
        if (ncLabeled) {
            nrNc = ncLabeled[1].replace(/\s+/g, '').toUpperCase();
        }
    }
    if (!nrNc) {
        const parts = texto.match(/(?:2026|20\d{2})\s*NC\s*(\d{6})(?!\d)/i);
        if (parts) nrNc = '2026NC' + parts[1];
    }
    if (!nrNc) {
        const seq = texto.match(/\bNC\s*(\d{6})(?!\d)/i);
        if (seq) nrNc = '2026NC' + seq[1];
    }

    m = texto.match(/(?:DATA\s+EMISS[AÃ]O|EMISS[AÃ]O)\s*[:\s]*(\d{2}[/\-.]\d{2}[/\-.]\d{2,4})/i);
    if (!m) {
        const datas = texto.match(/(\d{2}[/\-.]\d{2}[/\-.]\d{4})/g);
        if (datas) m = [null, datas[0]];
    }
    if (m) {
        const partes = m[1].split(/[/\-.]/);
        if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0');
            const mes = partes[1].padStart(2, '0');
            let ano = partes[2];
            if (ano.length === 2) ano = '20' + ano;
            dataNc = ano + '-' + mes + '-' + dia;
        }
    }

    let nds = [], valores = [];

    const secaoOrigem = texto.split('ORIGEM DO CRÉDITO')[1]?.split('DESTINO DO CRÉDITO')[0];
    if (secaoOrigem) {
        const rowPattern = /(\d{6})\s+\d+\s+\S+\s+R\$\s*([\d.,]+)/g;
        const matches = [...secaoOrigem.matchAll(rowPattern)];
        for (const m of matches) {
            nds.push(m[1]);
            const v = parseFloat(m[2].replace(/\./g, '').replace(',', '.')) || 0;
            if (v > 0) valores.push(v);
        }
    }

    if (nds.length > 0 || valores.length > 0) {
        const count = Math.max(nds.length, valores.length, 1);
        for (let i = 0; i < count; i++) {
            registros.push({
                nr_nc: nrNc,
                original_ou_complemento: 'ORIGINAL',
                nd: nds[i] || '',
                data_nc: dataNc,
                valor_nc: valores[i] || '',
            });
        }
    }

    if (registros.length === 0) {
        let valor = '';
        m = texto.match(/VALOR\s+TOTAL[^\d,.\n]*([\d.,]+)/i);
        if (m) {
            valor = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || '';
        }
        if (!valor) {
            m = texto.match(/(?:Valor\s+(?:NC|dota[cç][aãâ]o|cr[eé]dito|Total)|R\$\s*|Valor\s*[:\s]*)[^\d,.\n]*([\d.,]+(?:\d{2}))[^\d]/i);
            if (m) valor = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || '';
        }
        if (!valor) {
            const vals = [...texto.matchAll(/R\$\s*([\d.,]+)/g)];
            if (vals.length > 0) {
                let maior = 0;
                for (const v of vals) {
                    const num = parseFloat(v[1].replace(/\./g, '').replace(',', '.')) || 0;
                    if (num > maior) maior = num;
                }
                if (maior > 0) valor = maior;
            }
        }
        registros.push({
            nr_nc: nrNc, original_ou_complemento: 'ORIGINAL',
            nd: '', data_nc: dataNc, valor_nc: valor,
        });
    }

    return registros;
}

window.preencherTabelaNcs = async function() {
    if (ncUploadDados.length === 0) { toast('Nenhum dado de NC para processar.', 'error'); return; }
    if (!confirm('Preencher tabela Notas de Crédito com os dados extraídos?')) return;

    const ncsExist = DB.nc.buscarTodos();
    let criados = 0, pulados = 0;
    const erros = [];

    for (const d of ncUploadDados) {
        const ncDados = {
            nr_nc: d.nr_nc || '',
            original_ou_complemento: d.original_ou_complemento || 'ORIGINAL',
            nd: d.nd || '',
            data_nc: d.data_nc || null,
            valor_nc: parseFloat(d.valor_nc) || 0,
        };
        const existente = ncsExist.find(n =>
            n.nr_nc === ncDados.nr_nc &&
            n.original_ou_complemento === ncDados.original_ou_complemento &&
            n.nd === ncDados.nd &&
            n.data_nc === ncDados.data_nc &&
            n.valor_nc === ncDados.valor_nc
        );
        if (existente) {
            erros.push('NC "' + ncDados.nr_nc + '" (ND ' + ncDados.nd + ') já cadastrada com os mesmos dados.');
            pulados++;
            continue;
        }
        await DB.nc.criar(ncDados);
        criados++;
    }

    let msg = criados + ' NC(s) criada(s).';
    if (pulados > 0) msg += ' ' + pulados + ' NC(s) pulada(s) (já existente).';
    toast(msg);

    if (erros.length > 0) {
        openModal(`
            <div class="modal-header"><h3>Duplicatas Encontradas</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="modal-body">
                <p style="margin-bottom:12px;color:var(--text-muted);font-size:13px;">Os seguintes registros já existiam e foram ignorados:</p>
                <ul style="list-style:disc;padding-left:20px;line-height:1.8;">${erros.map(e => '<li>' + U.escape(e) + '</li>').join('')}</ul>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
            </div>
        `);
    }

    ncUploadDados = [];
    renderNcUploadTabelas();
    autoExportar();
};

window.limparArquivosNc = function() {
    document.getElementById('ncFileInfo').classList.add('hidden');
    document.getElementById('ncFileCount').textContent = '';
    document.getElementById('ncFileInput').value = '';
    document.getElementById('btnExtrairNc').disabled = true;
    document.getElementById('btnExtrairNc').className = 'btn btn-disabled';
};

/* ═══════════════════════════════════════════════════════════
   MILITARES
   ═══════════════════════════════════════════════════════════ */
function renderMilitares(el) {
    const milMap = {}; DB.militar.buscarTodos().forEach(m => milMap[m.id] = m);
    const missoes = DB.missao.buscarDadosCompletos();

    const seen = new Set();
    const rows = [];

    missoes.forEach(m => {
        if (!m.militar_id) return;
        const key = m.militar_id + '|' + (m.missao_operacao || '');
        if (seen.has(key)) return;
        seen.add(key);
        const mil = milMap[m.militar_id] || {};
        rows.push({
            id: m.militar_id, posto_grad: m.posto_grad || '',
            nome_completo: m.nome_completo || '', nome_guerra: m.nome_guerra || '',
            om_secao: m.om_secao || '', cpf: mil.cpf || '', identidade: mil.identidade || '',
            telefone: mil.telefone || '', email: mil.email || '',
            data_nascimento: mil.data_nascimento || '', endereco: mil.endereco || '',
            arquivo_dados: mil.arquivo_dados || '', arquivo_nome: mil.arquivo_nome || '',
            arquivo_tipo: mil.arquivo_tipo || '',
            missao_operacao: m.missao_operacao || '',
        });
    });

    Object.values(milMap).forEach(mil => {
        if (!rows.some(r => r.id === mil.id)) {
            rows.push({ id: mil.id, posto_grad: mil.posto_grad || '',
                nome_completo: mil.nome_completo || '', nome_guerra: mil.nome_guerra || '',
                om_secao: mil.om_secao || '', cpf: mil.cpf || '', identidade: mil.identidade || '',
                telefone: mil.telefone || '', email: mil.email || '',
                data_nascimento: mil.data_nascimento || '', endereco: mil.endereco || '',
                arquivo_dados: mil.arquivo_dados || '', arquivo_nome: mil.arquivo_nome || '',
                arquivo_tipo: mil.arquivo_tipo || '', missao_operacao: '' });
        }
    });

    const podeCriar = STA_Auth.canCreateMilitar();
    const podeEditar = (id) => STA_Auth.canEditMilitar(id);
    const podeExcluir = (id) => STA_Auth.canDeleteMilitar(id);
    const podeUpload = (id) => STA_Auth.canUploadArquivo(id);
    const isSALC = STA_Auth.currentUser?.role === 'salc';

    el.innerHTML = `
        <div class="top-bar">
            <input class="search-input" placeholder="Buscar militar..." oninput="filtrarMilitares(this.value)">
            ${podeCriar ? '<button class="btn btn-primary" onclick="abrirMilitarForm()">+ Novo Militar</button>' : ''}
        </div>
        <div class="table-wrap">
            <table style="min-width:2000px;"><thead><tr>
                <th>Missão / Operação</th><th>Posto/Grad</th><th>Nome Completo</th><th>Nome de Guerra</th>
                <th>OM/Seção</th><th>CPF</th><th>Identidade</th>
                <th>Telefone</th><th>Email</th><th>Data Nascimento</th><th>Endereço</th>
                <th>Arquivo</th>${!isSALC ? '<th style="width:100px">Ações</th>' : ''}
            </tr></thead>
            <tbody id="militarTableBody">
                ${rows.map(m => `
                    <tr${!isSALC ? ' ondblclick="abrirMilitarForm(' + m.id + ')"' : ''}>
                        <td>${U.escape(m.missao_operacao)}</td>
                        <td>${U.escape(m.posto_grad)}</td>
                        <td>${U.escape(m.nome_completo)}</td>
                        <td>${U.escape(m.nome_guerra)}</td>
                        <td>${U.escape(m.om_secao)}</td>
                        <td>${U.escape(m.cpf)}</td>
                        <td>${U.escape(m.identidade)}</td>
                        <td>${U.escape(m.telefone)}</td>
                        <td>${U.escape(m.email)}</td>
                        <td>${U.fmtDateBR(m.data_nascimento)}</td>
                        <td>${U.escape(m.endereco)}</td>
                        <td>
                            ${m.arquivo_dados
                                ? `<span class="action-cell"><button class="btn btn-sm btn-primary" onclick="baixarArquivo(${m.id})" title="Download">&#128229;</button> ${podeUpload(m.id) ? '<button class="btn btn-sm btn-secondary" onclick="uploadArquivo(' + m.id + ')" title="Substituir">&#128190;</button>' : ''}</span>`
                                : podeUpload(m.id) ? `<button class="btn btn-sm btn-secondary" onclick="uploadArquivo(${m.id})" title="Upload">&#128190; Upload</button>` : '<span style="color:var(--text-muted);font-size:11px">—</span>'}
                        </td>
                        ${!isSALC ? `
                        <td>
                            <span class="action-cell">
                                ${podeEditar(m.id) ? '<button class="btn-icon" onclick="abrirMilitarForm(' + m.id + ')" title="Editar">&#9998;</button>' : ''}
                                ${podeExcluir(m.id) ? '<button class="btn-icon danger" onclick="excluirMilitar(' + m.id + ')" title="Excluir">&#10005;</button>' : ''}
                            </span>
                        </td>` : ''}
                    </tr>
                `).join('')}
                ${rows.length === 0 ? '<tr><td colspan="' + (isSALC ? '12' : '13') + '" class="empty-msg">Nenhum militar cadastrado</td></tr>' : ''}
            </tbody></table>
        </div>`;
    U.enableColResize(el.querySelector('table'));
}

function filtrarMilitares(q) {
    const termo = q.toUpperCase();
    document.querySelectorAll('#militarTableBody tr').forEach(tr => {
        tr.style.display = termo ? (tr.textContent.toUpperCase().includes(termo) ? '' : 'none') : '';
    });
}

function uploadArquivo(id) {
    if (!STA_Auth.canUploadArquivo(id)) {
        toast('Você não tem permissão para enviar arquivos.', 'error');
        return;
    }
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.zip';
    inp.onchange = () => {
        const file = inp.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast('Arquivo muito grande. Máximo 5MB.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dados = {
                arquivo_nome: file.name,
                arquivo_tipo: file.type,
                arquivo_dados: e.target.result,
            };
            await DB.militar.atualizar(id, dados);
            toast('Arquivo salvo: ' + file.name);
            autoExportar();
            renderMilitares(document.getElementById('content'));
        };
        reader.readAsDataURL(file);
    };
    inp.click();
}

function baixarArquivo(id) {
    const m = DB.militar.buscarPorId(id);
    if (!m || !m.arquivo_dados) { toast('Nenhum arquivo para este militar.', 'error'); return; }
    const a = document.createElement('a');
    a.href = m.arquivo_dados;
    a.download = m.arquivo_nome || 'arquivo';
    a.click();
}

function abrirMilitarForm(id) {
    const dados = id ? DB.militar.buscarPorId(id) : null;
    openModal(`
        <div class="modal-header"><h3>${dados ? 'Editar' : 'Novo'} Militar</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group"><label>Posto/Grad</label>
                    <select id="f-mil-pg">
                        <option value="">Selecione</option>
                        <option value="Marechal" ${dados?.posto_grad === 'Marechal' ? 'selected' : ''}>Marechal</option>
                        <option value="General de Exército" ${dados?.posto_grad === 'General de Exército' ? 'selected' : ''}>General de Exército</option>
                        <option value="General de Divisão" ${dados?.posto_grad === 'General de Divisão' ? 'selected' : ''}>General de Divisão</option>
                        <option value="General de Brigada" ${dados?.posto_grad === 'General de Brigada' ? 'selected' : ''}>General de Brigada</option>
                        <option value="Coronel" ${dados?.posto_grad === 'Coronel' ? 'selected' : ''}>Coronel</option>
                        <option value="Tenente-Coronel" ${dados?.posto_grad === 'Tenente-Coronel' ? 'selected' : ''}>Tenente-Coronel</option>
                        <option value="Major" ${dados?.posto_grad === 'Major' ? 'selected' : ''}>Major</option>
                        <option value="Capitão" ${dados?.posto_grad === 'Capitão' ? 'selected' : ''}>Capitão</option>
                        <option value="Primeiro-Tenente" ${dados?.posto_grad === 'Primeiro-Tenente' ? 'selected' : ''}>Primeiro-Tenente</option>
                        <option value="Segundo-Tenente" ${dados?.posto_grad === 'Segundo-Tenente' ? 'selected' : ''}>Segundo-Tenente</option>
                        <option value="Aspirante a Oficial" ${dados?.posto_grad === 'Aspirante a Oficial' ? 'selected' : ''}>Aspirante a Oficial</option>
                        <option value="Cadete" ${dados?.posto_grad === 'Cadete' ? 'selected' : ''}>Cadete</option>
                        <option value="Subtenente" ${dados?.posto_grad === 'Subtenente' ? 'selected' : ''}>Subtenente</option>
                        <option value="Primeiro-Sargento" ${dados?.posto_grad === 'Primeiro-Sargento' ? 'selected' : ''}>Primeiro-Sargento</option>
                        <option value="Segundo-Sargento" ${dados?.posto_grad === 'Segundo-Sargento' ? 'selected' : ''}>Segundo-Sargento</option>
                        <option value="Terceiro-Sargento" ${dados?.posto_grad === 'Terceiro-Sargento' ? 'selected' : ''}>Terceiro-Sargento</option>
                        <option value="Cabo" ${dados?.posto_grad === 'Cabo' ? 'selected' : ''}>Cabo</option>
                        <option value="Soldado" ${dados?.posto_grad === 'Soldado' ? 'selected' : ''}>Soldado</option>
                    </select></div>
                <div class="form-group"><label>Nome Completo</label>
                    <input id="f-mil-nc" value="${U.escape(dados?.nome_completo || '')}"></div>
                <div class="form-group"><label>Nome de Guerra</label>
                    <input id="f-mil-ng" value="${U.escape(dados?.nome_guerra || '')}"></div>
                <div class="form-group"><label>OM/Seção</label>
                    <select id="f-mil-om">
                        <option value="">Selecione</option>
                        ${OM_OPTIONS.map(o =>
                            `<option value="${o}" ${dados?.om_secao === o ? 'selected' : ''}>${o}</option>`
                        ).join('')}
                    </select></div>
                <div class="form-group"><label>CPF</label>
                    <input id="f-mil-cpf" value="${U.escape(dados?.cpf || '')}"></div>
                <div class="form-group"><label>Identidade</label>
                    <input id="f-mil-ident" value="${U.escape(dados?.identidade || '')}"></div>
                <div class="form-group"><label>Telefone</label>
                    <input id="f-mil-tel" value="${U.escape(dados?.telefone || '')}"></div>
                <div class="form-group"><label>Email</label>
                    <input id="f-mil-email" value="${U.escape(dados?.email || '')}"></div>
                <div class="form-group"><label>Data de Nascimento</label>
                    <input type="date" id="f-mil-dtn" value="${U.fmtDate(dados?.data_nascimento) || ''}"></div>
                <div class="form-group full"><label>Endereço</label>
                    <input id="f-mil-end" value="${U.escape(dados?.endereco || '')}"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="salvarMilitar(${id || ''})">Salvar</button>
        </div>
    `);
}

async function salvarMilitar(id) {
    const dados = {
        posto_grad: document.getElementById('f-mil-pg').value.trim(),
        nome_completo: document.getElementById('f-mil-nc').value.trim(),
        nome_guerra: document.getElementById('f-mil-ng').value.trim(),
        om_secao: document.getElementById('f-mil-om').value.trim(),
        cpf: document.getElementById('f-mil-cpf').value.trim(),
        identidade: document.getElementById('f-mil-ident').value.trim(),
        telefone: document.getElementById('f-mil-tel').value.trim(),
        email: document.getElementById('f-mil-email').value.trim(),
        data_nascimento: document.getElementById('f-mil-dtn').value || null,
        endereco: document.getElementById('f-mil-end').value.trim(),
    };
    if (!dados.nome_guerra) { toast('Nome de Guerra é obrigatório.', 'error'); return; }

    if (id) {
        if (!STA_Auth.canEditMilitar(id)) {
            toast('Você não tem permissão para editar este militar.', 'error');
            return;
        }
        await DB.militar.atualizar(id, dados);
        toast('Militar atualizado.');
    } else {
        if (!STA_Auth.canCreateMilitar()) {
            toast('Você não tem permissão para criar militares.', 'error');
            return;
        }
        const inserted = await DB.militar.criar(dados);
        if (inserted && STA_Auth.isAnonymous) {
            STA_Auth.addAnonymousMilitar(inserted.id);
        }
        toast('Militar criado.');
    }
    closeModal();
    autoExportar();
    renderMilitares(document.getElementById('content'));
}

async function excluirMilitar(id) {
    if (!STA_Auth.canDeleteMilitar(id)) {
        toast('Você não tem permissão para excluir este militar.', 'error');
        return;
    }
    if (!confirm('Excluir este militar?')) return;
    await DB.militar.excluir(id);
    toast('Militar excluído.');
    autoExportar();
    renderMilitares(document.getElementById('content'));
}

/* ═══════════════════════════════════════════════════════════
   GERENCIAR ACESSOS (Admin)
   ═══════════════════════════════════════════════════════════ */
async function abrirGestaoUsuarios() {
  if (!STA_Auth.canManageUsers()) {
    toast('Acesso restrito.', 'error');
    return;
  }

  const usuarios = await STA_Auth.listUsers();
  const linhas = usuarios.filter(u => u.username !== 'admin').map(u => `
    <tr>
      <td>${U.escape(u.username)}</td>
      <td><span class="user-badge user-badge-${u.role}">${u.role.toUpperCase()}</span></td>
      <td>${u.created_at ? U.fmtDateBR(u.created_at.split('T')[0]) : '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="excluirUsuario(${u.id})">Excluir</button></td>
    </tr>
  `).join('');

  openModal(`
    <div class="modal-header"><h3>Gerenciar Acessos</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <div class="user-mgmt-header">
        <h3>Usuários</h3>
        <button class="btn btn-primary btn-sm" onclick="abrirFormNovoUsuario()">+ Novo Usuário</button>
      </div>
      <table class="user-table">
        <thead><tr><th>Usuário</th><th>Nível</th><th>Criado em</th><th></th></tr></thead>
        <tbody>
          ${linhas || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhum usuário cadastrado.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
    </div>
  `, false);
}

window.abrirFormNovoUsuario = function() {
  openModal(`
    <div class="modal-header"><h3>Novo Usuário</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Usuário</label>
          <input id="f-user-name" placeholder="Nome de usuário"></div>
        <div class="form-group"><label>Senha</label>
          <input type="password" id="f-user-pass" placeholder="Senha"></div>
        <div class="form-group"><label>Nível de Acesso</label>
          <select id="f-user-role">
            <option value="sta">STA</option>
            <option value="salc">SALC</option>
          </select></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarNovoUsuario()">Salvar</button>
    </div>
  `, false);
};

window.salvarNovoUsuario = async function() {
  const username = document.getElementById('f-user-name').value.trim();
  const password = document.getElementById('f-user-pass').value;
  const role = document.getElementById('f-user-role').value;

  if (!username || !password) {
    toast('Preencha todos os campos.', 'error');
    return;
  }
  if (password.length < 4) {
    toast('Senha deve ter no mínimo 4 caracteres.', 'error');
    return;
  }

  try {
    await STA_Auth.register(username, password, role);
    closeModal();
    toast('Usuário criado com sucesso.');
    abrirGestaoUsuarios();
  } catch (e) {
    toast(e.message, 'error');
  }
};

window.excluirUsuario = async function(id) {
  if (!confirm('Excluir este usuário?')) return;
  try {
    await STA_Auth.deleteUser(id);
    toast('Usuário excluído.');
    closeModal();
    abrirGestaoUsuarios();
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
};

function classificarNc(nd, valor) {
    let letra = '', ndClass = '';
    if (nd === '339015' && valor !== 95) { letra = 'D'; ndClass = 'nc-d'; }
    else if (nd === '339015' && valor === 95) { letra = 'A'; ndClass = 'nc-a'; }
    else if (nd === '339033') { letra = 'P'; ndClass = 'nc-p'; }
    else if (nd === '339039') { letra = 'S'; ndClass = 'nc-s'; }
    return { letra, ndClass };
}

/* ═══════════════════════════════════════════════════════════
   NOTAS DE CRÉDITO
   ═══════════════════════════════════════════════════════════ */
function renderNcs(el) {
    const todas = DB.nc.buscarTodos();
    el.innerHTML = `
        <div class="top-bar">
            <input class="search-input" placeholder="Buscar por NC, ND..." oninput="filtrarNcs(this.value)">
            <button class="btn btn-primary" onclick="abrirNcForm()">+ Nova NC</button>
        </div>
        <div class="table-wrap">
            <table><thead><tr>
                <th>NC</th><th>Orig/Comp</th><th>ND</th><th>Data NC</th>
                <th>Valor NC</th><th>Utilizado</th><th>Saldo</th>
                <th>NR DIEX/Req</th><th>Data Envio DIEX</th><th>NR NE</th><th>Data Assinatura Empenho</th>
                <th>NR MSG SIAFI</th><th>Data MSG SIAFI</th><th>NC Recolhimento</th>
                <th style="width:100px">Ações</th>
            </tr></thead>
            <tbody id="ncTableBody">
                ${todas.map(n => {
                    const c = classificarNc(n.nd, n.valor_nc);
                    return `<tr ondblclick="abrirNcForm(${n.id})">
                        <td>${U.escape(n.nr_nc)}${c.letra ? '<span class="nc-letra">' + c.letra + '</span>' : ''}</td>
                        <td>${U.escape(n.original_ou_complemento)}</td>
                        <td class="${c.ndClass}">${U.escape(n.nd)}</td>
                        <td>${U.fmtDateBR(n.data_nc)}</td>
                        <td>${U.fmtBRL(n.valor_nc)}</td>
                        <td><strong>${U.fmtBRL(n.valor_utilizado)}</strong></td>
                        <td>${U.fmtBRL(n.saldo)}</td>
                        <td>${U.escape(n.nr_diex_requisicao)}</td>
                        <td>${U.fmtDateBR(n.data_envio_diex_req_salc)}</td>
                        <td>${U.escape(n.nr_ne)}</td>
                        <td>${U.fmtDateBR(n.data_assinatura_empenho)}</td>
                        <td>${U.escape(n.nr_msg_siafi_diex)}</td>
                        <td>${U.fmtDateBR(n.data_msg_siafi_diex)}</td>
                        <td>${U.escape(n.nc_recolhimento)}</td>
                        <td>
                            <span class="action-cell">
                                <button class="btn-icon" onclick="abrirNcForm(${n.id})" title="Editar">&#9998;</button>
                                <button class="btn-icon danger" onclick="excluirNc(${n.id})" title="Excluir">&#10005;</button>
                            </span>
                        </td>
                    </tr>`;
                }).join('')}
                ${todas.length === 0 ? '<tr><td colspan="15" class="empty-msg">Nenhuma NC cadastrada</td></tr>' : ''}
            </tbody></table>
        </div>`;
    U.enableColResize(el.querySelector('table'));
}

function filtrarNcs(q) {
    const termo = q.toUpperCase();
    document.querySelectorAll('#ncTableBody tr').forEach(tr => {
        tr.style.display = termo ? (tr.textContent.toUpperCase().includes(termo) ? '' : 'none') : '';
    });
}

function abrirNcForm(id) {
    const dados = id ? DB.nc.buscarPorId(id) : null;
    const ncNum = dados?.nr_nc || '';
    const ncNumOnly = ncNum.toUpperCase().startsWith('2026NC') ? ncNum.slice(6) : ncNum;
    openModal(`
        <div class="modal-header"><h3>${dados ? 'Editar' : 'Nova'} Nota de Crédito</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group"><label>NR NC</label>
                    <div style="display:flex;align-items:stretch;">
                        <span style="background:#e9ecef;border:1px solid var(--border);border-right:none;border-radius:4px 0 0 4px;padding:8px 10px;font-weight:700;color:#495057;font-size:14px;display:flex;align-items:center;">2026NC</span>
                        <input id="f-nc-num" value="${U.escape(ncNumOnly)}" placeholder="Ex: 400131" style="border-radius:0 4px 4px 0;flex:1;">
                    </div></div>
                <div class="form-group"><label>Orig/Comp</label>
                    <select id="f-nc-oc">
                        <option ${dados?.original_ou_complemento === 'ORIGINAL' ? 'selected' : ''}>ORIGINAL</option>
                        <option ${dados?.original_ou_complemento === 'COMPLEMENTO' ? 'selected' : ''}>COMPLEMENTO</option>
                    </select></div>
                <div class="form-group"><label>ND</label>
                    <select id="f-nc-nd">
                        <option value="">Selecione</option>
                        <option value="339015" ${dados?.nd === '339015' ? 'selected' : ''}>339015</option>
                        <option value="339033" ${dados?.nd === '339033' ? 'selected' : ''}>339033</option>
                        <option value="339039" ${dados?.nd === '339039' ? 'selected' : ''}>339039</option>
                    </select></div>
                <div class="form-group"><label>Data NC</label>
                    <input type="date" id="f-nc-data" value="${U.fmtDate(dados?.data_nc) || U.today()}"></div>
                <div class="form-group"><label>Valor NC</label>
                    <input type="number" step="0.01" min="0" id="f-nc-valor" value="${dados?.valor_nc || ''}"></div>
            </div>
            <details style="margin-top:16px;cursor:pointer;color:var(--text-muted)">
                <summary style="font-weight:600;font-size:13px;">Dados Adicionais</summary>
                <div class="form-grid" style="margin-top:12px;">
                    <div class="form-group"><label>NR DIEX/Requisição</label>
                        <input id="f-nc-diex" value="${U.escape(dados?.nr_diex_requisicao || '')}"></div>
                    <div class="form-group"><label>Data Envio DIEX</label>
                        <input type="date" id="f-nc-dt-diex" value="${U.fmtDate(dados?.data_envio_diex_req_salc) || ''}"></div>
                    <div class="form-group"><label>NR NE</label>
                        <input id="f-nc-ne" value="${U.escape(dados?.nr_ne || '')}"></div>
                    <div class="form-group"><label>Data Assinatura Empenho</label>
                        <input type="date" id="f-nc-dt-ne" value="${U.fmtDate(dados?.data_assinatura_empenho) || ''}"></div>
                    <div class="form-group"><label>NR MSG SIAFI</label>
                        <input id="f-nc-msg" value="${U.escape(dados?.nr_msg_siafi_diex || '')}"></div>
                    <div class="form-group"><label>Data MSG SIAFI</label>
                        <input type="date" id="f-nc-dt-msg" value="${U.fmtDate(dados?.data_msg_siafi_diex) || ''}"></div>
                    <div class="form-group"><label>NC Recolhimento</label>
                        <input id="f-nc-rec" value="${U.escape(dados?.nc_recolhimento || '')}"></div>
                </div>
            </details>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="salvarNc(${id || ''})">Salvar</button>
        </div>
    `);
}

async function salvarNc(id) {
    const numInput = document.getElementById('f-nc-num').value.trim();
    if (!numInput) { toast('NR NC é obrigatório.', 'error'); return; }
    const dados = {
        nr_nc: '2026NC' + numInput,
        original_ou_complemento: document.getElementById('f-nc-oc').value,
        nd: document.getElementById('f-nc-nd').value,
        data_nc: document.getElementById('f-nc-data').value || null,
        valor_nc: parseFloat(document.getElementById('f-nc-valor').value) || 0,
        nr_diex_requisicao: (document.getElementById('f-nc-diex')?.value || '').trim(),
        data_envio_diex_req_salc: document.getElementById('f-nc-dt-diex')?.value || null,
        nr_ne: (document.getElementById('f-nc-ne')?.value || '').trim(),
        data_assinatura_empenho: document.getElementById('f-nc-dt-ne')?.value || null,
        nr_msg_siafi_diex: (document.getElementById('f-nc-msg')?.value || '').trim(),
        data_msg_siafi_diex: document.getElementById('f-nc-dt-msg')?.value || null,
        nc_recolhimento: (document.getElementById('f-nc-rec')?.value || '').trim(),
    };
    if (id) await DB.nc.atualizar(id, dados);
    else await DB.nc.criar(dados);
    closeModal();
    toast(id ? 'NC atualizada.' : 'NC criada.');
    autoExportar();
    navigate('ncs');
}

async function excluirNc(id) {
    if (!confirm('Excluir esta NC?')) return;
    await DB.nc.excluir(id);
    toast('NC excluída.');
    autoExportar();
    navigate('ncs');
}

/* ═══════════════════════════════════════════════════════════
   MISSÕES
   ═══════════════════════════════════════════════════════════ */
function renderMissoes(el) {
    const dados = DB.missao.buscarDadosCompletos();
    dados.sort((a, b) => {
        const oA = a.ordem ?? 999999;
        const oB = b.ordem ?? 999999;
        if (oA !== 999999 || oB !== 999999) return oA - oB;
        const dateA = a.data_inicio_missao || '';
        const dateB = b.data_inicio_missao || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const nameA = (a.nome_completo || a.nome_guerra || '').toLowerCase();
        const nameB = (b.nome_completo || b.nome_guerra || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        const missA = (a.missao_operacao || '').toLowerCase();
        const missB = (b.missao_operacao || '').toLowerCase();
        return missA.localeCompare(missB);
    });
    el.innerHTML = `
        <div class="top-bar">
            <input class="search-input" placeholder="Buscar missão, militar, NC..." oninput="filtrarMissoes(this.value)">
            <button class="btn btn-primary" onclick="abrirMissaoForm()">+ Nova Missão</button>
        </div>
        <div class="table-wrap" id="missaoTableWrap">
            <table style="min-width:3300px;"><thead><tr>
                <th class="sticky-col">Missão / Operação</th>
                <th class="sticky-col">Nome de Guerra</th>
                <th class="sticky-col">NR Processo</th>
                <th>Item</th>
                <th>Posto/Grad</th>
                <th>OM/Seção</th>
                <th>Data Rec. Processo</th>
                <th>Local</th>
                <th>Nac/Int</th>
                <th>Data Ida</th>
                <th>Data Retorno</th>
                <th>Data Início Missão</th>
                <th>Data Final Missão</th>
                <th>NR Diárias</th>
                <th>% Diárias</th>
                <th>NR NC</th>
                <th>NC Orig/Comp</th>
                <th>ND</th>
                <th>Data NC</th>
                <th>Valor NC</th>
                <th>Valor Utilizado</th>
                <th>NR DIEX/Req</th>
                <th>Data Envio DIEX</th>
                <th>NR NE</th>
                <th>Data Assinatura Empenho</th>
                <th>NR MSG SIAFI</th>
                <th>Data MSG SIAFI</th>
                <th>Obs</th>
                <th>Situação Prazo</th>
                <th>Fase do Processo</th>
                <th>Data da Fase</th>
                <th>Data Entrega Relatório</th>
                <th>Dias sem Relatório</th>
                <th>Situação Relatório</th>
                <th style="width:130px">Ações</th>
            </tr></thead>
            <tbody id="missaoTableBody">
                ${dados.map(r => {
                    const temObs = !!r.missao_observacao;
                    return `<tr draggable="true" data-missao-id="${r.missao_id}" class="${U.situacaoClass(r.situacao_relatorio)} ${temObs ? 'has-obs' : ''}"
                        ondblclick="abrirMissaoForm(${r.missao_id})"
                        oncontextmenu="return abrirContextMenuMissao(event, ${r.missao_id})">
                        <td class="sticky-col">${U.escape(r.missao_operacao)}</td>
                        <td class="sticky-col">${U.escape(r.nome_guerra)}</td>
                        <td class="sticky-col">${U.escape(r.nr_processo)}</td>
                        <td>${r.item}</td>
                        <td>${U.escape(r.posto_grad)}</td>
                        <td>${U.escape(r.om_secao)}</td>
                        <td>${U.fmtDateBR(r.data_recebimento_processo)}</td>
                        <td>${U.escape(r.local)}</td>
                        <td>${U.escape(r.nacional_internacional)}</td>
                        <td>${U.fmtDateBR(r.data_ida)}</td>
                        <td>${U.fmtDateBR(r.data_retorno)}</td>
                        <td>${U.fmtDateBR(r.data_inicio_missao)}</td>
                        <td>${U.fmtDateBR(r.data_final_missao)}</td>
                        <td>${r.nr_diarias ?? ''}</td>
                        <td>${U.escape(r.pc_diarias)}</td>
                        <td>${(() => { const c = classificarNc(r.nd, r.valor_nc); return U.escape(r.nr_nc) + (c.letra ? '<span class="nc-letra">' + c.letra + '</span>' : ''); })()}</td>
                        <td>${U.escape(r.original_ou_complemento)}</td>
                        <td class="${(() => classificarNc(r.nd, r.valor_nc).ndClass)()}">${U.escape(r.nd)}</td>
                        <td>${U.fmtDateBR(r.data_nc)}</td>
                        <td>${U.fmtBRL(r.valor_nc)}</td>
                        <td><strong>${U.fmtBRL(r.valor_utilizado)}</strong></td>
                        <td>${U.escape(r.nr_diex_requisicao)}</td>
                        <td>${U.fmtDateBR(r.data_envio_diex_req_salc)}</td>
                        <td>${U.escape(r.nr_ne)}</td>
                        <td>${U.fmtDateBR(r.data_assinatura_empenho)}</td>
                        <td>${U.escape(r.nr_msg_siafi_diex)}</td>
                        <td>${U.fmtDateBR(r.data_msg_siafi_diex)}</td>
                        <td>${temObs ? '[OK]' : ''}</td>
                        <td>${U.escape(r.situacao_prazo_entrega)}</td>
                        <td>${U.escape(r.fase_processo)}</td>
                        <td>${U.fmtDateBR(r.data_fase_processo)}</td>
                        <td>${U.fmtDateBR(r.data_entrega_relatorio)}</td>
                        <td>${r.dias_corridos_sem_relatorio ?? ''}</td>
                        <td>${U.escape(r.situacao_relatorio)}</td>
                        <td>
                            <span class="action-cell">
                                <button class="btn-icon" onclick="abrirMissaoForm(${r.missao_id})" title="Editar">&#9998;</button>
                                <button class="btn-icon danger" onclick="excluirMissao(${r.missao_id})" title="Excluir">&#10005;</button>
                                ${temObs ? `<span style="font-size:13px;color:var(--warning);font-weight:700;" title="Observação">&#9888;</span>` : ''}
                            </span>
                        </td>
                    </tr>`;
                }).join('')}
                ${dados.length === 0 ? '<tr><td colspan="35" class="empty-msg">Nenhuma missão cadastrada</td></tr>' : ''}
            </tbody></table>
        </div>`;
    const tbl = el.querySelector('table');
    U.enableColResize(tbl);
    updateStickyColLeft(tbl);
    initDragAndDrop(tbl);
}

function initDragAndDrop(table) {
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;
    let draggedRow = null;

    const isEmptyRow = (tr) => tr && tr.querySelector('.empty-msg');

    tbody.addEventListener('dragstart', (e) => {
        const tr = e.target.closest('tr');
        if (!tr || isEmptyRow(tr) || !tr.dataset.missaoId) return;
        draggedRow = tr;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tr.dataset.missaoId);
        tr.classList.add('dragging');
        tbody.querySelectorAll('tr[data-missao-id]').forEach(r => r.style.cursor = 'grabbing');
    });

    tbody.addEventListener('dragend', () => {
        if (draggedRow) draggedRow.classList.remove('dragging');
        tbody.querySelectorAll('tr[data-missao-id]').forEach(r => { r.style.cursor = ''; r.classList.remove('drop-above', 'drop-below'); });
        draggedRow = null;
    });

    tbody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const tr = e.target.closest('tr');
        if (!tr || tr === draggedRow || isEmptyRow(tr) || !tr.dataset.missaoId) return;
        e.dataTransfer.dropEffect = 'move';

        const rect = tr.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        tbody.querySelectorAll('tr[data-missao-id]').forEach(r => r.classList.remove('drop-above', 'drop-below'));
        tr.classList.add(e.clientY < mid ? 'drop-above' : 'drop-below');
    });

    tbody.addEventListener('dragleave', (e) => {
        const tr = e.target.closest('tr');
        const related = e.relatedTarget?.closest('tr');
        if (tr && tr !== related) tr.classList.remove('drop-above', 'drop-below');
    });

    tbody.addEventListener('drop', async (e) => {
        e.preventDefault();
        const targetTr = e.target.closest('tr');
        if (!targetTr || !draggedRow || isEmptyRow(targetTr)) return;

        const draggedId = parseInt(draggedRow.dataset.missaoId);
        const targetId = parseInt(targetTr.dataset.missaoId);
        if (draggedId === targetId) return;

        const allRows = Array.from(tbody.querySelectorAll('tr:not(.empty-msg)'));
        const visible = allRows.filter(r => r.style.display !== 'none');
        let draggedIdx = visible.indexOf(draggedRow);
        let targetIdx = visible.indexOf(targetTr);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const ids = visible.map(r => parseInt(r.dataset.missaoId));
        ids.splice(draggedIdx, 1);
        ids.splice(targetIdx, 0, draggedId);

        for (let i = 0; i < ids.length; i++) {
            await DB.missao.atualizar(ids[i], { ordem: i });
        }
        toast('Ordem atualizada.');
        renderMissoes(document.getElementById('content'));
    });
}

function filtrarMissoes(q) {
    const termo = q.toUpperCase();
    document.querySelectorAll('#missaoTableBody tr').forEach(tr => {
        tr.style.display = termo ? (tr.textContent.toUpperCase().includes(termo) ? '' : 'none') : '';
    });
}

/* ─── Context menu missão ─── */
function abrirContextMenuMissao(event, missaoId) {
    event.preventDefault();
    fecharContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'ctxMenu';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.innerHTML = `
        <button onclick="abrirMissaoForm(${missaoId}); fecharContextMenu();">&#9998; Editar</button>
        <button onclick="abrirObsMissao(${missaoId}); fecharContextMenu();">&#128221; Adicionar Observação</button>
    `;
    document.body.appendChild(menu);
    document.addEventListener('click', fecharContextMenu, { once: true });
    return false;
}

function fecharContextMenu() {
    const el = document.getElementById('ctxMenu');
    if (el) el.remove();
}

function abrirObsMissao(missaoId) {
    const m = DB.missao.buscarPorId(missaoId);
    if (!m) return;
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <div class="modal-header"><h3>Observação da Missão</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:13px;text-transform:none;color:var(--text);">Missão: ${U.escape(m.missao_operacao)}</label>
                <textarea id="f-obs-texto" style="min-height:150px;width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;resize:vertical;" placeholder="Digite a observação...">${U.escape(m.observacao || '')}</textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="salvarObsMissao(${missaoId})">Salvar</button>
        </div>
    `;
    modal.classList.remove('hidden');
    document.querySelector('.modal-backdrop').onclick = closeModal;
}

async function salvarObsMissao(missaoId) {
    const texto = document.getElementById('f-obs-texto').value;
    await DB.missao.atualizar(missaoId, { observacao: texto });
    closeModal();
    toast('Observação salva.');
    autoExportar();
    navigate('missoes');
}

function abrirMissaoForm(id) {
    const dados = id ? DB.missao.buscarPorId(id) : null;
    const militares = DB.militar.buscarTodos();
    const ncs = DB.nc.buscarTodos();
    const editMode = !!dados;

    openModal(`
        <div class="modal-header"><h3>${editMode ? 'Editar' : 'Nova'} Missão</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group"><label>Item</label>
                    <input type="number" id="f-m-item" value="${dados?.item || DB.missao.proximoItem()}"></div>
                <div class="form-group full"><label>Missão / Operação</label>
                    <input id="f-m-op" value="${U.escape(dados?.missao_operacao || '')}"></div>
                <div class="form-group"><label>NR Processo</label>
                    <input id="f-m-nr-processo" value="${U.escape(dados?.nr_processo || '')}"></div>
                <div class="form-group full"><label>Local</label>
                    <input id="f-m-local" value="${U.escape(dados?.local || '')}"></div>
                <div class="form-group"><label>Nac/Int</label>
                    <select id="f-m-nac">
                        <option value="">Selecione</option>
                        <option value="NACIONAL" ${dados?.nacional_internacional === 'NACIONAL' ? 'selected' : ''}>NACIONAL</option>
                        <option value="INTERNACIONAL" ${dados?.nacional_internacional === 'INTERNACIONAL' ? 'selected' : ''}>INTERNACIONAL</option>
                    </select></div>
                <div class="form-group"><label>Data Ida</label>
                    <input type="date" id="f-m-dt-ida" value="${U.fmtDate(dados?.data_ida) || U.today()}"></div>
                <div class="form-group"><label>Data Retorno</label>
                    <input type="date" id="f-m-dt-ret" value="${U.fmtDate(dados?.data_retorno) || U.today()}"></div>
                <div class="form-group"><label>Data Início Missão</label>
                    <input type="date" id="f-m-dt-ini" value="${U.fmtDate(dados?.data_inicio_missao) || U.today()}"></div>
                <div class="form-group"><label>Data Final Missão</label>
                    <input type="date" id="f-m-dt-fim" value="${U.fmtDate(dados?.data_final_missao) || U.today()}"></div>
                <div class="form-group"><label>NR de Diárias</label>
                    <input type="number" step="0.1" id="f-m-diarias" value="${dados?.nr_diarias ?? 0.5}"></div>
                <div class="form-group"><label>% Diárias</label>
                    <select id="f-m-pc">
                        <option value="100%" ${(!dados || dados?.pc_diarias === '100%') ? 'selected' : ''}>100%</option>
                        <option value="50%" ${dados?.pc_diarias === '50%' ? 'selected' : ''}>50%</option>
                        <option value="75%" ${dados?.pc_diarias === '75%' ? 'selected' : ''}>75%</option>
                    </select></div>
                <div class="form-group"><label>Data Rec. Processo</label>
                    <input type="date" id="f-m-dt-rec" value="${U.fmtDate(dados?.data_recebimento_processo) || U.today()}"></div>
                <div class="form-group"><label>Nota de Crédito</label>
                    <select id="f-m-nc">
                        <option value="">Selecione uma NC</option>
                        ${ncs.map(nc => { const c = classificarNc(nc.nd, nc.valor_nc); return `<option value="${nc.id}" ${dados?.nc_id === nc.id ? 'selected' : ''}>${U.escape(nc.nr_nc)}${c.letra}${nc.nd ? ' - ND ' + nc.nd : ''}</option>`; }).join('')}
                    </select></div>
                <div class="form-group"><label>Valor Utilizado (NC)</label>
                    <input type="number" step="0.01" min="0" id="f-m-valor" value="${dados?.valor_utilizado_nc || ''}"></div>
                <div class="form-group"><label>Situação Prazo</label>
                    <select id="f-m-sit-prazo">
                        <option value="">Selecione</option>
                        <option value="ENTREGOU DENTRO DO PRAZO" ${dados?.situacao_prazo_entrega === 'ENTREGOU DENTRO DO PRAZO' ? 'selected' : ''}>ENTREGOU DENTRO DO PRAZO</option>
                        <option value="ENTREGOU FORA DO PRAZO" ${dados?.situacao_prazo_entrega === 'ENTREGOU FORA DO PRAZO' ? 'selected' : ''}>ENTREGOU FORA DO PRAZO</option>
                    </select></div>
                <div class="form-group"><label>Fase do Processo</label>
                    <select id="f-m-fase">
                        <option value="">Selecione</option>
                        <option value="ENCERRADA" ${dados?.fase_processo === 'ENCERRADA' ? 'selected' : ''}>ENCERRADA</option>
                        <option value="LIQUIDADO" ${dados?.fase_processo === 'LIQUIDADO' ? 'selected' : ''}>LIQUIDADO</option>
                        <option value="CANCELADO" ${dados?.fase_processo === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
                        <option value="RECOLHIDA" ${dados?.fase_processo === 'RECOLHIDA' ? 'selected' : ''}>RECOLHIDA</option>
                        <option value="FALTA DOCUMENTAÇÃO" ${dados?.fase_processo === 'FALTA DOCUMENTAÇÃO' ? 'selected' : ''}>FALTA DOCUMENTAÇÃO</option>
                    </select></div>
                <div class="form-group"><label>Data da Fase</label>
                    <input type="date" id="f-m-dt-fase" value="${U.fmtDate(dados?.data_fase_processo) || ''}"></div>
                <div class="form-group"><label>Data Entrega Relatório</label>
                    <input type="date" id="f-m-dt-rel" value="${U.fmtDate(dados?.data_entrega_relatorio) || ''}"></div>
                <div class="form-group"><label>Dias sem Relatório</label>
                    <input type="number" id="f-m-dias" value="${dados?.dias_corridos_sem_relatorio || 0}"></div>
                <div class="form-group"><label>Situação Relatório</label>
                    <select id="f-m-sit-rel">
                        <option value="">Selecione</option>
                        <option value="EM ANDAMENTO" ${dados?.situacao_relatorio === 'EM ANDAMENTO' ? 'selected' : ''}>EM ANDAMENTO</option>
                        <option value="FINALIZADO" ${dados?.situacao_relatorio === 'FINALIZADO' ? 'selected' : ''}>FINALIZADO</option>
                        <option value="CANCELADO" ${dados?.situacao_relatorio === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
                        <option value="RECOLHIDA" ${dados?.situacao_relatorio === 'RECOLHIDA' ? 'selected' : ''}>RECOLHIDA</option>
                    </select></div>
                <div class="form-group full"><label>${editMode ? 'Militar' : 'Militares (selecione um ou mais)'}</label>
                    <div class="checkbox-list" id="f-m-mil-list">
                        ${militares.map(m => `
                            <label>
                                <input type="${editMode ? 'radio' : 'checkbox'}" name="militares" value="${m.id}"
                                    ${editMode && dados?.militar_id === m.id ? 'checked' : ''}>
                                ${U.escape(m.posto_grad)} ${U.escape(m.nome_guerra)} - ${U.escape(m.om_secao)}
                            </label>
                        `).join('')}
                        ${militares.length === 0 ? '<div style="color:var(--text-muted);padding:8px;">Nenhum militar cadastrado. Crie um militar primeiro.</div>' : ''}
                    </div></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="salvarMissao(${id || ''})">Salvar</button>
        </div>
    `);
}

async function salvarMissao(id) {
    const getVal = (elId) => {
        const el = document.getElementById(elId);
        return el ? el.value : '';
    };

    const base = {
        item: parseInt(getVal('f-m-item')) || 1,
        missao_operacao: getVal('f-m-op').trim(),
        nr_processo: getVal('f-m-nr-processo').trim(),
        local: getVal('f-m-local').trim(),
        nacional_internacional: getVal('f-m-nac'),
        data_ida: getVal('f-m-dt-ida') || null,
        data_retorno: getVal('f-m-dt-ret') || null,
        data_inicio_missao: getVal('f-m-dt-ini') || null,
        data_final_missao: getVal('f-m-dt-fim') || null,
        nr_diarias: parseFloat(getVal('f-m-diarias')) || 0,
        pc_diarias: getVal('f-m-pc'),
        data_recebimento_processo: getVal('f-m-dt-rec') || null,
        situacao_prazo_entrega: getVal('f-m-sit-prazo'),
        fase_processo: getVal('f-m-fase'),
        data_fase_processo: getVal('f-m-dt-fase') || null,
        data_entrega_relatorio: getVal('f-m-dt-rel') || null,
        dias_corridos_sem_relatorio: parseInt(getVal('f-m-dias')) || 0,
        situacao_relatorio: getVal('f-m-sit-rel'),
    };

    const ncId = parseInt(getVal('f-m-nc')) || null;
    const valorUtilizado = parseFloat(getVal('f-m-valor')) || 0;

    const selected = [];
    document.querySelectorAll('input[name="militares"]:checked').forEach(el => {
        selected.push(parseInt(el.value));
    });

    if (selected.length === 0) {
        toast('Selecione pelo menos um militar.', 'error');
        return;
    }

    // ── EDIT mode ──
    if (id) {
        const dadosAntigos = DB.missao.buscarPorId(id);
        const ncIdAntigo = dadosAntigos?.nc_id || null;
        const valorAntigo = dadosAntigos?.valor_utilizado_nc || 0;

        base.militar_id = selected[0];

        // Adjust NC accumulation
        if (ncId) {
            if (ncIdAntigo && ncIdAntigo !== ncId) {
                await DB.nc.subtrairValorUtilizado(ncIdAntigo, valorAntigo);
                await DB.nc.acumularValorUtilizado(ncId, valorUtilizado);
            } else if (ncIdAntigo === ncId) {
                const diff = valorUtilizado - valorAntigo;
                if (diff !== 0) await DB.nc.acumularValorUtilizado(ncId, diff);
            } else {
                await DB.nc.acumularValorUtilizado(ncId, valorUtilizado);
            }
        } else if (ncIdAntigo) {
            await DB.nc.subtrairValorUtilizado(ncIdAntigo, valorAntigo);
        }

        base.nc_id = ncId;
        base.valor_utilizado_nc = valorUtilizado;
        await DB.missao.atualizar(id, base);
        closeModal();
        toast('Missão atualizada.');
        autoExportar();
        navigate('missoes');
        return;
    }

    // ── NEW mode (multi-militar) ──
    for (const militarId of selected) {
        await DB.missao.criar({
            ...base,
            militar_id: militarId,
            nc_id: ncId,
            valor_utilizado_nc: valorUtilizado,
        });
    }

    // Accumulate total to NC
    if (ncId && valorUtilizado > 0 && selected.length > 0) {
        await DB.nc.acumularValorUtilizado(ncId, valorUtilizado * selected.length);
    }

    closeModal();
    toast(`Missão(ões) criada(s) para ${selected.length} militar(es).`);
    autoExportar();
    navigate('missoes');
}

async function excluirMissao(id) {
    const m = DB.missao.buscarPorId(id);
    const nome = m?.missao_operacao || `item ${m?.item}`;
    if (!confirm(`Excluir a missão "${nome}"?`)) return;
    await DB.missao.excluir(id);
    toast('Missão excluída.');
    autoExportar();
    navigate('missoes');
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    STA_Auth.init();
    initLoginUI();

    if (!STA_Auth.isAuthenticated()) {
        // Aguarda ação do usuário no login overlay
        return;
    }

    try {
        await DB.init();
    } catch (err) {
        console.error(err);
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger);"><h3>Erro ao conectar ao Supabase</h3><p style="margin-top:8px;">' + U.escape(err.message) + '</p></div>';
        return;
    }

    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    atualizarInterfaceUsuario();
    initNavButtons();
    initSidebar();

    const firstView = ['dashboard', 'militares', 'pcpd', 'uploadNc', 'missoes', 'ncs'].find(v => STA_Auth.canAccess(v)) || 'militares';
    navigate(firstView);
});
