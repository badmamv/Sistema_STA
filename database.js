const DB = {
    _supabaseUrl: 'https://dmdpzuacxrjsppnsidkp.supabase.co',
    _supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZHB6dWFjeHJqc3BwbnNpZGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDcxMjAsImV4cCI6MjA5NTIyMzEyMH0.n6SxLf-lMomPGpINfJZ_aQInA4MQ_6XpzZd4eYYyDGc',

    _tables: ['militar', 'missao', 'nc'],
    _cache: { militar: [], missao: [], nc: [] },
    _ready: false,
    _initPromise: null,

    init() {
        if (this._ready) return Promise.resolve();
        if (!this._initPromise) {
            this._initPromise = this._doInit();
        }
        return this._initPromise;
    },

    async _doInit() {
        try {
            if (!this.googleSheets.WEBAPP_URL) {
                this.googleSheets.WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyRVaUYInWN-QLj_5oXNBO8W1uWHDDuqVVxQXceqoGIpiE1NJfLgM2kxSUcdf_2PcDp/exec';
            }
            await this._loadFromSupabase();
            await this._migrateIfNeeded();
            this._ready = true;
        } catch (err) {
            console.error('DB init error:', err);
            toast?.('Erro ao conectar ao banco de dados.', 'error');
            this._initPromise = null;
            throw err;
        }
    },

    async _rest(method, table, opts = {}) {
        const params = [];
        if (opts.select) params.push('select=' + opts.select);
        if (opts.order) params.push('order=' + opts.order);
        if (opts.query) params.push(opts.query);
        const qs = params.length ? '?' + params.join('&') : '';

        const headers = {
            'apikey': this._supabaseKey,
            'Authorization': 'Bearer ' + this._supabaseKey,
            'Content-Type': 'application/json',
        };
        if (opts.body && method !== 'DELETE') {
            headers['Prefer'] = 'return=representation';
        }

        const res = await fetch(this._supabaseUrl + '/rest/v1/' + table + qs, {
            method, headers,
            body: opts.body ? JSON.stringify(opts.body) : void 0,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(method + ' ' + table + ' ' + res.status + ': ' + text.slice(0, 200));
        }
        if (method === 'DELETE' || method === 'HEAD') return null;
        return res.json();
    },

    async _loadFromSupabase() {
        for (const t of this._tables) {
            const data = await this._rest('GET', t, { select: '*', order: 'id.asc' });
            this._cache[t] = Array.isArray(data) ? data : [];
        }
    },

    async _migrateIfNeeded() {
        const hasLocal = this._tables.some(t => {
            try {
                const d = JSON.parse(localStorage.getItem('sta_' + t));
                return Array.isArray(d) && d.length > 0;
            } catch { return false; }
        });
        if (!hasLocal) return;
        if (this._tables.some(t => this._cache[t].length > 0)) {
            for (const t of this._tables) localStorage.removeItem('sta_' + t);
            return;
        }

        for (const t of this._tables) {
            const stored = JSON.parse(localStorage.getItem('sta_' + t) || '[]');
            const existIds = new Set(this._cache[t].map(r => r.id));
            const pendentes = stored.filter(r => !existIds.has(r.id));
            for (const rec of pendentes) {
                try {
                    const [inserted] = await this._rest('POST', t, { body: rec, select: '*' });
                    if (inserted) this._cache[t].push(inserted);
                } catch (e) {
                    console.warn('Migrate skip ' + t + ' id=' + rec.id + ': ' + e.message);
                }
            }
            localStorage.removeItem('sta_' + t);
        }
        toast?.('Dados migrados do navegador para o Supabase.');
    },

    /* ─── Helpers ─── */
    _normalizeNome(dados) {
        if (dados.nome_completo) dados.nome_completo = dados.nome_completo.toUpperCase();
        if (dados.nome_guerra) dados.nome_guerra = dados.nome_guerra.toUpperCase();
        return dados;
    },
    _findInCache(table, id) {
        return this._cache[table].find(d => d.id === id) || null;
    },
    _filterCache(table, fn) {
        return this._cache[table].filter(fn);
    },

    /* ─── Militar ─── */
    militar: {
        async criar(dados) {
            const [inserted] = await DB._rest('POST', 'militar', { body: DB._normalizeNome({ ...dados }), select: '*' });
            if (inserted) DB._cache.militar.push(inserted);
            return inserted;
        },
        buscarTodos() { return DB._cache.militar; },
        buscarPorId(id) { return DB._findInCache('militar', id); },
        async atualizar(id, dados) {
            const [updated] = await DB._rest('PATCH', 'militar', { body: DB._normalizeNome({ ...dados }), query: 'id=eq.' + id, select: '*' });
            if (updated) {
                const idx = DB._cache.militar.findIndex(r => r.id === id);
                if (idx >= 0) Object.assign(DB._cache.militar[idx], updated);
            }
            return updated;
        },
        async excluir(id) {
            for (const m of DB._cache.missao.filter(m => m.militar_id === id)) {
                await DB.missao.atualizar(m.id, { militar_id: null });
            }
            await DB._rest('DELETE', 'militar', { query: 'id=eq.' + id });
            DB._cache.militar = DB._cache.militar.filter(r => r.id !== id);
        },
    },

    /* ─── NC ─── */
    nc: {
        async criar(dados) {
            const body = { ...dados };
            body.saldo = (body.valor_nc || 0) - (body.valor_utilizado || 0);
            const [inserted] = await DB._rest('POST', 'nc', { body, select: '*' });
            if (inserted) DB._cache.nc.push(inserted);
            return inserted;
        },
        buscarTodos() { return DB._cache.nc; },
        buscarPorId(id) { return DB._findInCache('nc', id); },
        async atualizar(id, dados) {
            const body = { ...dados };
            if ('valor_nc' in body || 'valor_utilizado' in body) {
                const atual = DB._findInCache('nc', id) || {};
                body.saldo = ((body.valor_nc ?? atual.valor_nc) || 0) - ((body.valor_utilizado ?? atual.valor_utilizado) || 0);
            }
            const [updated] = await DB._rest('PATCH', 'nc', { body, query: 'id=eq.' + id, select: '*' });
            if (updated) {
                const idx = DB._cache.nc.findIndex(r => r.id === id);
                if (idx >= 0) Object.assign(DB._cache.nc[idx], updated);
            }
            return updated;
        },
        async excluir(id) {
            for (const m of DB._cache.missao.filter(m => m.nc_id === id)) {
                await DB.missao.atualizar(m.id, { nc_id: null, valor_utilizado_nc: 0 });
            }
            await DB._rest('DELETE', 'nc', { query: 'id=eq.' + id });
            DB._cache.nc = DB._cache.nc.filter(r => r.id !== id);
        },
        async acumularValorUtilizado(ncId, valor) {
            if (!ncId || !valor) return;
            const nc = DB._findInCache('nc', ncId);
            if (!nc) return;
            const novoUtilizado = (nc.valor_utilizado || 0) + valor;
            const novoSaldo = (nc.valor_nc || 0) - novoUtilizado;
            await DB.nc.atualizar(ncId, { valor_utilizado: novoUtilizado, saldo: novoSaldo });
        },
        subtrairValorUtilizado(ncId, valor) {
            if (!ncId || !valor) return;
            return DB.nc.acumularValorUtilizado(ncId, -valor);
        },
    },

    /* ─── Missao ─── */
    missao: {
        async criar(dados) {
            const [inserted] = await DB._rest('POST', 'missao', { body: { ...dados }, select: '*' });
            if (inserted) DB._cache.missao.push(inserted);
            return inserted;
        },
        buscarTodos() { return DB._cache.missao; },
        buscarPorId(id) { return DB._findInCache('missao', id); },
        async atualizar(id, dados) {
            const [updated] = await DB._rest('PATCH', 'missao', { body: { ...dados }, query: 'id=eq.' + id, select: '*' });
            if (updated) {
                const idx = DB._cache.missao.findIndex(r => r.id === id);
                if (idx >= 0) Object.assign(DB._cache.missao[idx], updated);
            }
            return updated;
        },
        async excluir(id) {
            const m = DB._findInCache('missao', id);
            if (m && m.nc_id && m.valor_utilizado_nc) {
                await DB.nc.subtrairValorUtilizado(m.nc_id, m.valor_utilizado_nc);
            }
            await DB._rest('DELETE', 'missao', { query: 'id=eq.' + id });
            DB._cache.missao = DB._cache.missao.filter(r => r.id !== id);
        },
        proximoItem() {
            return DB._cache.missao.length
                ? Math.max(...DB._cache.missao.map(m => m.item)) + 1
                : 1;
        },
        buscarDadosCompletos() {
            const mils = DB._cache.militar;
            const ncs = DB._cache.nc;
            return DB._cache.missao.map(m => {
                const mil = mils.find(x => x.id === m.militar_id) || {};
                const nc = ncs.find(x => x.id === m.nc_id) || {};
                return {
                    ...m, missao_id: m.id,
                    posto_grad: mil.posto_grad || '', nome_completo: mil.nome_completo || '',
                    nome_guerra: mil.nome_guerra || '', om_secao: mil.om_secao || '',
                    nr_nc: nc.nr_nc || '', original_ou_complemento: nc.original_ou_complemento || '',
                    nd: nc.nd || '', data_nc: nc.data_nc || '',
                    valor_nc: nc.valor_nc || 0,
                    valor_utilizado: m.valor_utilizado_nc || nc.valor_utilizado || 0,
                    nr_diex_requisicao: nc.nr_diex_requisicao || '',
                    data_envio_diex_req_salc: nc.data_envio_diex_req_salc || '',
                    nr_ne: nc.nr_ne || '', data_assinatura_empenho: nc.data_assinatura_empenho || '',
                    nr_msg_siafi_diex: nc.nr_msg_siafi_diex || '',
                    data_msg_siafi_diex: nc.data_msg_siafi_diex || '',
                    missao_observacao: m.observacao || '',
                };
            });
        },
    },

    /* ─── Google Sheets Sync ─── */
    googleSheets: {
        get WEBAPP_URL() { return localStorage.getItem('sta_webapp_url') || ''; },
        set WEBAPP_URL(val) { localStorage.setItem('sta_webapp_url', val || ''); },

        _fmtDate(d) { return d ? d.split('T')[0] : ''; },
        _fmtBRL(v) {
            const n = parseFloat(v) || 0;
            return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        },
        _fmtDateBR(dataISO) {
            if (!dataISO) return '';
            const meses = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAIO', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
            const d = new Date(dataISO + 'T12:00:00');
            if (isNaN(d.getTime())) return dataISO;
            return ('0' + d.getDate()).slice(-2) + '/' + meses[d.getMonth() + 1] + '/' + d.getFullYear();
        },
        _parseDateISO(texto) {
            if (!texto) return '';
            const meses = { JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAIO: '05', JUN: '06', JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12' };
            const partes = texto.split('/');
            if (partes.length === 3 && meses[partes[1]?.toUpperCase()]) {
                return partes[2] + '-' + meses[partes[1].toUpperCase()] + '-' + ('0' + parseInt(partes[0])).slice(-2);
            }
            if (partes.length === 3 && /^\d+$/.test(partes[0]) && /^\d+$/.test(partes[1])) {
                return partes[2] + '-' + ('0' + parseInt(partes[1])).slice(-2) + '-' + ('0' + parseInt(partes[0])).slice(-2);
            }
            return texto;
        },
        _parseBRL(texto) {
            if (!texto) return 0;
            let s = texto.toString().trim();
            if (s.startsWith('R$')) s = s.slice(2).trim();
            s = s.replace(/\./g, '').replace(',', '.');
            return parseFloat(s) || 0;
        },
        _jsonp(url) {
            return new Promise((resolve, reject) => {
                const cb = 'gs_jsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
                const timeout = setTimeout(() => {
                    delete window[cb];
                    document.head.removeChild(script);
                    reject(new Error('Timeout ao conectar com o Web App'));
                }, 15000);
                window[cb] = (data) => {
                    clearTimeout(timeout);
                    delete window[cb];
                    document.head.removeChild(script);
                    resolve(data);
                };
                const script = document.createElement('script');
                script.src = url + '&callback=' + cb;
                script.onerror = () => {
                    clearTimeout(timeout);
                    delete window[cb];
                    document.head.removeChild(script);
                    reject(new Error('Erro de rede ao conectar com o Web App'));
                };
                document.head.appendChild(script);
            });
        },
        headersMENU: [
            'ITEM', 'MISSÃO / OPERAÇÃO', 'POSTO / GRAD', 'NOME', 'NOME DE GUERRA',
            'NR PROCESSO', 'OM/SEÇÃO', 'DATA RECEBIMENTO PROCESSO (PCPD+BI)', 'LOCAL',
            'NACIONAL / INTERNACIONAL', 'DATA IDA (Aqs passagem)', 'DATA RETORNO (Aqs passagem)',
            'DATA INÍCIO MISSÃO', 'DATA FINAL DA MISSÃO', 'NR DE DIÁRIAS', '% DIÁRIAS',
            'NR NC', 'NC ORIGINAL OU COMPLEMENTO?', 'ND', 'DATA DA NC', 'VALOR DA NC',
            'VALOR UTILIZADO', 'NR DIEX / REQUISIÇÃO', 'DATA ENVIO DIEX/REQ PARA A SALC',
            'NR NE', 'DATA ASSINATURA DO EMPENHO', 'NR DA MSG SIAFI/DIEX',
            'DATA DA MSG SIAFIDIEX', 'OBSERVAÇÃO',
            'SITUAÇÃO DO PRAZO DE ENTREGA DO PROCESSO', 'FASE DO PROCESSO',
            'DATA DA FASE DO PROCESSO', 'DATA DA ENTREGA DO RELATÓRIO DE VIAGEM',
            'DIAS CORRIDOS APÓS MISSÃO SEM A ENTREGA DO RELATÓRIO DE VIAGEM',
            'SITUAÇÃO DO RELATÓRIO DE VIAGEM',
        ],
        headersNC: [
            'NC', 'ORIGINAL / COMPLEMENTO', 'ND', 'DATA NC', 'VALOR NC',
            'UTILIZADO', 'SALDO', 'DIEX RECOLHIMENTO', 'DATA', 'MSG SIAFI', 'DATA',
            'NC RECOLHIMENTO',
        ],
        _buildMenuRows() {
            const dados = DB.missao.buscarDadosCompletos();
            const rows = [this.headersMENU];
            for (const r of dados) {
                rows.push([
                    r.item?.toString() || '',
                    r.missao_operacao || '',
                    r.posto_grad || '',
                    r.nome_completo || '',
                    r.nome_guerra || '',
                    r.nr_processo || '',
                    r.om_secao || '',
                    this._fmtDateBR(r.data_recebimento_processo),
                    r.local || '',
                    r.nacional_internacional || '',
                    this._fmtDateBR(r.data_ida),
                    this._fmtDateBR(r.data_retorno),
                    this._fmtDateBR(r.data_inicio_missao),
                    this._fmtDateBR(r.data_final_missao),
                    r.nr_diarias?.toString() || '',
                    r.pc_diarias || '',
                    r.nr_nc || '',
                    r.original_ou_complemento || '',
                    (r.nd || r.nd === 0) ? r.nd.toString() : '',
                    this._fmtDateBR(r.data_nc),
                    this._fmtBRL(r.valor_nc),
                    this._fmtBRL(r.valor_utilizado),
                    r.nr_diex_requisicao || '',
                    this._fmtDateBR(r.data_envio_diex_req_salc),
                    r.nr_ne || '',
                    this._fmtDateBR(r.data_assinatura_empenho),
                    r.nr_msg_siafi_diex || '',
                    this._fmtDateBR(r.data_msg_siafi_diex),
                    r.missao_observacao || r.observacao || '',
                    r.situacao_prazo_entrega || '',
                    r.fase_processo || '',
                    this._fmtDateBR(r.data_fase_processo),
                    this._fmtDateBR(r.data_entrega_relatorio),
                    r.dias_corridos_sem_relatorio?.toString() || '',
                    r.situacao_relatorio || '',
                ]);
            }
            return rows;
        },
        _buildNCRows() {
            const ncs = DB.nc.buscarTodos();
            const rows = [this.headersNC];
            for (const n of ncs) {
                rows.push([
                    n.nr_nc || '',
                    n.original_ou_complemento || '',
                    (n.nd || n.nd === 0) ? n.nd.toString() : '',
                    this._fmtDateBR(n.data_nc),
                    this._fmtBRL(n.valor_nc),
                    this._fmtBRL(n.valor_utilizado),
                    this._fmtBRL(n.saldo),
                    n.nr_diex_requisicao || '',
                    this._fmtDateBR(n.data_envio_diex_req_salc),
                    n.nr_msg_siafi_diex || '',
                    this._fmtDateBR(n.data_msg_siafi_diex),
                    n.nc_recolhimento || '',
                ]);
            }
            return rows;
        },
        async exportar() {
            const url = DB.googleSheets.WEBAPP_URL;
            if (!url) throw new Error('WEBAPP_URL não configurada');
            const menuData = DB.googleSheets._buildMenuRows();
            const ncData = DB.googleSheets._buildNCRows();
            await fetch(url, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'export_menu', tab: 'MENU', data: menuData }),
            });
            await fetch(url, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'export_nc', tab: 'NC', data: ncData }),
            });
        },
        async importar() {
            const url = DB.googleSheets.WEBAPP_URL;
            if (!url) throw new Error('WEBAPP_URL não configurada');
            const self = DB.googleSheets;
            const sep = url.includes('?') ? '&' : '?';
            const jsonMenu = await self._jsonp(url + sep + 'action=read&tab=MENU');
            if (!jsonMenu.ok) throw new Error(jsonMenu.error || 'Erro ao ler MENU');
            const jsonNC = await self._jsonp(url + sep + 'action=read&tab=NC');
            if (!jsonNC.ok) throw new Error(jsonNC.error || 'Erro ao ler NC');

            const menuRows = jsonMenu.data || [];
            let startRow = 0;
            for (let i = 0; i < menuRows.length; i++) {
                if (menuRows[i]?.[0]?.toString().toUpperCase() === 'ITEM') {
                    startRow = i + 1;
                    break;
                }
            }
            const missoes = {};
            const militares = {};
            const ncsImport = {};
            for (let i = startRow; i < menuRows.length; i++) {
                const row = menuRows[i];
                if (!row || !row[0]?.toString().trim()) continue;
                const item = parseInt(row[0]) || 0;
                if (!item) continue;
                const missaoOp = (row[1] || '').toString().trim();
                const postoGrad = (row[2] || '').toString().trim();
                const nomeCompleto = (row[3] || '').toString().trim();
                const nomeGuerra = (row[4] || '').toString().trim();
                const omSecao = (row[6] || '').toString().trim();
                const nrNc = (row[16] || '').toString().trim();
                const milKey = nomeGuerra + '|' + nomeCompleto;
                if (nomeGuerra && !militares[milKey]) {
                    militares[milKey] = { posto_grad: postoGrad, nome_completo: nomeCompleto, nome_guerra: nomeGuerra, om_secao: omSecao };
                }
                if (!missoes[item]) {
                    missoes[item] = {
                        item, missao_operacao: missaoOp, nr_processo: (row[5] || '').toString().trim(),
                        local: (row[8] || '').toString().trim(),
                        nacional_internacional: (row[9] || '').toString().trim(),
                        data_ida: self._parseDateISO(row[10]),
                        data_retorno: self._parseDateISO(row[11]),
                        data_inicio_missao: self._parseDateISO(row[12]),
                        data_final_missao: self._parseDateISO(row[13]),
                        nr_diarias: parseFloat((row[14] || '').toString().replace(',', '.')) || 0,
                        pc_diarias: (row[15] || '').toString().trim(),
                        data_recebimento_processo: self._parseDateISO(row[7]),
                        situacao_prazo_entrega: (row[29] || '').toString().trim(),
                        fase_processo: (row[30] || '').toString().trim(),
                        data_fase_processo: self._parseDateISO(row[31]),
                        data_entrega_relatorio: self._parseDateISO(row[32]),
                        dias_corridos_sem_relatorio: parseInt(row[33]) || 0,
                        situacao_relatorio: (row[34] || '').toString().trim(),
                        observacao: (row[28] || '').toString().trim(),
                        militar_id: null, nc_id: null,
                        valor_utilizado_nc: self._parseBRL(row[20]),
                        nome_guerra_assoc: nomeGuerra, nr_nc_assoc: nrNc,
                    };
                }
                if (nrNc && !ncsImport[nrNc]) {
                    ncsImport[nrNc] = {
                        nr_nc: nrNc,
                        original_ou_complemento: (row[17] || '').toString().trim(),
                        nd: (row[18] || '').toString().trim(),
                        data_nc: self._parseDateISO(row[19]),
                        valor_nc: self._parseBRL(row[20]),
                        valor_utilizado: self._parseBRL(row[21]),
                        saldo: self._parseBRL(row[20]) - self._parseBRL(row[21]),
                        nr_diex_requisicao: (row[22] || '').toString().trim(),
                        data_envio_diex_req_salc: self._parseDateISO(row[23]),
                        nr_ne: (row[24] || '').toString().trim(),
                        data_assinatura_empenho: self._parseDateISO(row[25]),
                        nr_msg_siafi_diex: (row[26] || '').toString().trim(),
                        data_msg_siafi_diex: self._parseDateISO(row[27]),
                        nc_recolhimento: '',
                    };
                }
            }

            for (const key of Object.keys(militares)) {
                const m = militares[key];
                const exist = DB._cache.militar.find(x => x.nome_guerra === m.nome_guerra && x.nome_completo === m.nome_completo);
                if (!exist) await DB.militar.criar(m);
            }
            const ncsExist = DB._cache.nc;
            for (const nr of Object.keys(ncsImport)) {
                const exist = ncsExist.find(n => n.nr_nc === nr);
                if (!exist) await DB.nc.criar(ncsImport[nr]);
            }
            for (const itemKey of Object.keys(missoes)) {
                const m = missoes[itemKey];
                const exist = DB._cache.missao.find(x => x.item === m.item);
                const mil = m.nome_guerra_assoc ? DB._cache.militar.find(x => x.nome_guerra === m.nome_guerra_assoc) : null;
                const ncRec = m.nr_nc_assoc ? DB._cache.nc.find(x => x.nr_nc === m.nr_nc_assoc) : null;
                if (!exist) {
                    const { nome_guerra_assoc, nr_nc_assoc, ...dados } = m;
                    await DB.missao.criar({ ...dados, militar_id: mil?.id || null, nc_id: ncRec?.id || null });
                }
            }

            const ncRows = jsonNC.data || [];
            for (let i = 1; i < ncRows.length; i++) {
                const row = ncRows[i];
                if (!row || !row[0]?.toString().trim()) continue;
                const nrNc = row[0].toString().trim();
                const exist = DB._cache.nc.find(n => n.nr_nc === nrNc);
                if (exist) {
                    await DB.nc.atualizar(exist.id, {
                        saldo: self._parseBRL(row[6]),
                        valor_utilizado: self._parseBRL(row[5]),
                    });
                }
            }
        },
        async testar() {
            const url = DB.googleSheets.WEBAPP_URL;
            if (!url) return { ok: false, error: 'WEBAPP_URL não configurada' };
            const sep = url.includes('?') ? '&' : '?';
            try {
                return await this._jsonp(url + sep + 'action=ping');
            } catch (err) {
                return { ok: false, error: err.message };
            }
        },
    },

    /* ─── Backup / Restore ─── */
    exportar() {
        const data = {};
        for (const t of this._tables) data[t] = this._cache[t];
        return JSON.stringify(data, null, 2);
    },
    async importar(jsonStr) {
        const data = JSON.parse(jsonStr);
        for (const t of this._tables) {
            if (!Array.isArray(data[t])) continue;
            for (const rec of data[t]) {
                const exist = this._cache[t].find(r => r.id === rec.id);
                if (exist) {
                    await this._rest('PATCH', t, { body: rec, query: 'id=eq.' + rec.id });
                } else {
                    await this._rest('POST', t, { body: rec, select: '*' });
                }
            }
            this._cache[t] = data[t];
        }
    },

    /* ─── Dashboard ─── */
    dashboard() {
        const missoes = DB._cache.missao;
        const ncs = DB._cache.nc;
        const militares = DB._cache.militar;
        const hoje = new Date();
        const hojeISO = hoje.toISOString().split('T')[0];
        const daqui30 = new Date(hoje.getTime() + 30 * 86400000).toISOString().split('T')[0];
        const milMap = {};
        for (const mil of militares) milMap[mil.id] = mil;

        const em_andamento = missoes.filter(m => m.situacao_relatorio === 'EM ANDAMENTO').length;
        const relatorios_atrasados = missoes.filter(m =>
            m.data_final_missao && m.data_final_missao < hojeISO &&
            m.situacao_relatorio !== 'FINALIZADO' &&
            m.situacao_relatorio !== 'CANCELADO' &&
            m.situacao_relatorio !== 'RECOLHIDA'
        );
        const relatorios_muito_atrasados = relatorios_atrasados.filter(m =>
            (m.dias_corridos_sem_relatorio || 0) >= 30
        );
        const proximas_missoes = missoes.filter(m =>
            m.data_inicio_missao && m.data_inicio_missao >= hojeISO &&
            m.data_inicio_missao <= daqui30
        );
        const valor_total_nc = ncs.reduce((s, n) => s + (n.valor_nc || 0), 0);
        const saldo_total_nc = ncs.reduce((s, n) => s + (n.saldo || 0), 0);
        const valor_total_utilizado = ncs.reduce((s, n) => s + (n.valor_utilizado || 0), 0);

        const missoes_por_situacao = {};
        const missoes_por_om = {};
        const missoes_por_mes = {};
        const fases_processo = {};
        const prazo_entrega = {};

        for (const m of missoes) {
            const sit = m.situacao_relatorio || 'Sem situação';
            missoes_por_situacao[sit] = (missoes_por_situacao[sit] || 0) + 1;
            const mil = milMap[m.militar_id];
            const om = (mil && mil.om_secao) || 'Sem OM';
            missoes_por_om[om] = (missoes_por_om[om] || 0) + 1;
            if (m.data_inicio_missao) {
                const mes = m.data_inicio_missao.slice(0, 7);
                missoes_por_mes[mes] = (missoes_por_mes[mes] || 0) + 1;
            }
            const fase = m.fase_processo || 'Sem fase';
            fases_processo[fase] = (fases_processo[fase] || 0) + 1;
            const prazo = m.situacao_prazo_entrega || 'Sem informação';
            prazo_entrega[prazo] = (prazo_entrega[prazo] || 0) + 1;
        }

        function joinMil(m) {
            const mil = milMap[m.militar_id] || {};
            return { ...m, posto_grad: mil.posto_grad || '', nome_guerra: mil.nome_guerra || '', om_secao: mil.om_secao || '' };
        }

        const relatorios_pendentes_lista = relatorios_atrasados
            .map(joinMil)
            .sort((a, b) => (b.dias_corridos_sem_relatorio || 0) - (a.dias_corridos_sem_relatorio || 0))
            .slice(0, 5);
        const proximas_missoes_lista = proximas_missoes
            .map(joinMil)
            .sort((a, b) => a.data_inicio_missao.localeCompare(b.data_inicio_missao))
            .slice(0, 5);
        const missoes_recentes = missoes
            .filter(m => m.data_inicio_missao)
            .map(joinMil)
            .sort((a, b) => b.data_inicio_missao.localeCompare(a.data_inicio_missao))
            .slice(0, 5);
        const missoes_por_om_ordenado = Object.entries(missoes_por_om)
            .sort((a, b) => b[1] - a[1]);
        const missoes_por_mes_ordenado = Object.entries(missoes_por_mes)
            .sort((a, b) => a[0].localeCompare(b[0]));

        return {
            total_missoes: missoes.length,
            total_ncs: ncs.length,
            total_militares: militares.length,
            valor_total_utilizado,
            missoes_por_situacao,
            em_andamento,
            relatorios_atrasados: relatorios_atrasados.length,
            relatorios_muito_atrasados: relatorios_muito_atrasados.length,
            proximas_missoes_count: proximas_missoes.length,
            valor_total_nc,
            saldo_total_nc,
            missoes_por_om: missoes_por_om_ordenado,
            missoes_por_mes: missoes_por_mes_ordenado,
            fases_processo,
            prazo_entrega,
            relatorios_pendentes_lista,
            proximas_missoes_lista,
            missoes_recentes,
        };
    },
};

DB.init().catch(console.error);
