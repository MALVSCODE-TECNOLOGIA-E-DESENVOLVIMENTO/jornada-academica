const API_URL = '/api';
let token = localStorage.getItem('jornada_token');
let registrosGlobais = [];

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const formRegistro = document.getElementById('form-registro');
const modal = document.getElementById('modal-form');
const tableBody = document.getElementById('table-body');

// --- AUTENTICAÇÃO ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao logar');

        token = data.token;
        localStorage.setItem('jornada_token', token);
        document.getElementById('user-name').textContent = `Olá, ${data.nome}`;
        
        loginScreen.style.display = 'none';
        appScreen.style.display = 'block';
        carregarRegistros();
    } catch (err) {
        errorMsg.textContent = err.message;
    }
});

function logout() {
    localStorage.removeItem('jornada_token');
    window.location.reload();
}

// Verifica se já está logado
if (token) {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'block';
    carregarRegistros();
}

// --- CRUD E DASHBOARD ---
async function carregarRegistros() {
    try {
        const res = await fetch(`${API_URL}/registros`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }

        registrosGlobais = await res.json();
        renderTable();
        atualizarDashboard();
    } catch (err) {
        console.error('Erro ao carregar:', err);
    }
}

function calcularDesempenho(qtd, erros) {
    if (qtd === 0) return 0;
    const acertos = qtd - erros;
    return Math.round((acertos / qtd) * 100);
}

function obterSituacao(desempenho) {
    if (desempenho === 100) return { texto: 'ÓTIMO', classe: 'badge-otimo' };
    if (desempenho >= 60) return { texto: 'BOM', classe: 'badge-bom' };
    return { texto: 'RUIM', classe: 'badge-ruim' };
}

function renderTable() {
    const search = document.getElementById('search').value.toLowerCase();
    
    const filtrados = registrosGlobais.filter(r => 
        r.materia.toLowerCase().includes(search) || 
        r.conteudo.toLowerCase().includes(search)
    );

    if (filtrados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtrados.map(r => {
        const dataFormatada = new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        const situacao = obterSituacao(desempenho);

        return `
            <tr>
                <td><strong>${r.materia}</strong></td>
                <td>${r.conteudo}</td>
                <td>${dataFormatada}</td>
                <td><strong>${desempenho}%</strong></td>
                <td><span class="badge ${situacao.classe}">${situacao.texto}</span></td>
                <td style="text-align: center;">
                    <button class="action-btn btn-edit" onclick="abrirModal('${r.id}')">Editar</button>
                    <button class="action-btn btn-delete" onclick="excluirRegistro('${r.id}')">Excluir</button>
                </td>
            </tr>
        `;
    }).join('');
}

function atualizarDashboard() {
    const total = registrosGlobais.length;
    let concluidos = 0;
    let alertas = 0;
    let somaDesempenho = 0;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    registrosGlobais.forEach(r => {
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        somaDesempenho += desempenho;

        if (desempenho === 100) concluidos++;

        const dataEstudo = new Date(r.data + 'T00:00:00');
        if (dataEstudo < hoje && desempenho < 100) {
            alertas++;
        }
    });

    const mediaDesempenho = total > 0 ? Math.round(somaDesempenho / total) : 0;

    document.getElementById('dash-total').textContent = total;
    document.getElementById('dash-concluidos').textContent = concluidos;
    document.getElementById('dash-alerta').textContent = alertas;
    document.getElementById('dash-desempenho').textContent = `${mediaDesempenho}%`;
}

// --- MODAL ---
function abrirModal(id = null) {
    modal.classList.add('active');
    formRegistro.reset();
    
    if (id) {
        document.getElementById('modal-title').textContent = 'Editar Registro';
        document.getElementById('registro-id').value = id;
        const r = registrosGlobais.find(x => x.id === id);
        if (r) {
            document.getElementById('materia').value = r.materia;
            document.getElementById('conteudo').value = r.conteudo;
            document.getElementById('data').value = r.data;
            document.getElementById('qtd_questoes').value = r.qtd_questoes;
            document.getElementById('qtd_erros').value = r.qtd_erros;
        }
    } else {
        document.getElementById('modal-title').textContent = 'Novo Registro';
        document.getElementById('registro-id').value = '';
        document.getElementById('data').value = new Date().toISOString().split('T')[0];
    }
}

function fecharModal() {
    modal.classList.remove('active');
}

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('registro-id').value;
    const payload = {
        materia: document.getElementById('materia').value,
        conteudo: document.getElementById('conteudo').value,
        data: document.getElementById('data').value,
        qtd_questoes: parseInt(document.getElementById('qtd_questoes').value),
        qtd_erros: parseInt(document.getElementById('qtd_erros').value)
    };

    // Validação básica
    if (payload.qtd_erros > payload.qtd_questoes) {
        alert('O número de erros não pode ser maior que o total de questões.');
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/registros/${id}` : `${API_URL}/registros`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            fecharModal();
            carregarRegistros();
        } else {
            alert('Erro ao salvar registro.');
        }
    } catch (err) {
        console.error(err);
    }
});

async function excluirRegistro(id) {
    if (!confirm('Deseja realmente excluir este registro?')) return;

    try {
        const res = await fetch(`${API_URL}/registros/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) carregarRegistros();
    } catch (err) {
        console.error(err);
    }
}
