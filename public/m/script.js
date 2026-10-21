const API_URL = '/api';
let token = localStorage.getItem('jornada_token');
let registrosGlobais = [];

if (!token) window.location.href = '/login/';

const formRegistro = document.getElementById('form-registro');
const modal = document.getElementById('modal-form');
const listContainer = document.getElementById('list-container');

function logout() {
    localStorage.removeItem('jornada_token');
    window.location.href = '/login/';
}

async function carregarRegistros() {
    try {
        const res = await fetch(`${API_URL}/registros`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) { logout(); return; }
        
        registrosGlobais = await res.json();
        preencherFiltroMaterias();
        renderTable();
        atualizarDashboard();
    } catch (err) { console.error(err); }
}

function preencherFiltroMaterias() {
    const select = document.getElementById('filter-materia');
    const materiasUnicas = [...new Set(registrosGlobais.map(r => r.materia))].sort();
    select.innerHTML = '<option value="">Matéria (Todas)</option>';
    materiasUnicas.forEach(m => { select.innerHTML += `<option value="${m}">${m}</option>`; });
}

function calcularDesempenho(qtd, erros) {
    if (qtd === 0) return 0;
    return Math.round(((qtd - erros) / qtd) * 100);
}

function obterSituacao(desempenho) {
    if (desempenho === 100) return { texto: 'ÓTIMO', classe: 'badge-otimo' };
    if (desempenho >= 60) return { texto: 'BOM', classe: 'badge-bom' };
    return { texto: 'RUIM', classe: 'badge-ruim' };
}

function renderTable() {
    const search = document.getElementById('search').value.toLowerCase();
    const materiaFiltro = document.getElementById('filter-materia').value;
    const situacaoFiltro = document.getElementById('filter-situacao').value;
    
    const filtrados = registrosGlobais.filter(r => {
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        const situacao = obterSituacao(desempenho).texto;
        const matchSearch = r.conteudo.toLowerCase().includes(search) || r.materia.toLowerCase().includes(search);
        const matchMateria = materiaFiltro ? r.materia === materiaFiltro : true;
        const matchSituacao = situacaoFiltro ? situacao === situacaoFiltro : true;
        return matchSearch && matchMateria && matchSituacao;
    });

    if (filtrados.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:#6B7280; padding:2rem;">Nenhum registro encontrado.</p>`;
        return;
    }

    listContainer.innerHTML = filtrados.map(r => {
        const dataFormatada = new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        const situacao = obterSituacao(desempenho);

        return `
            <div class="mobile-card">
                <div class="mc-header">
                    <strong>${r.materia}</strong>
                    <span class="badge ${situacao.classe}">${situacao.texto}</span>
                </div>
                <div class="mc-body">
                    <p><strong>Conteúdo:</strong> ${r.conteudo}</p>
                    <p><strong>Data:</strong> ${dataFormatada} | <strong>Desempenho:</strong> ${desempenho}%</p>
                </div>
                <div class="mc-actions">
                    <button class="btn-edit" onclick="abrirModal('${r.id}')">Editar</button>
                    <button class="btn-delete" onclick="excluirRegistro('${r.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function atualizarDashboard() {
    let concluidos = 0, alertas = 0, somaDesempenho = 0;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    registrosGlobais.forEach(r => {
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        somaDesempenho += desempenho;
        if (desempenho === 100) concluidos++;
        const dataEstudo = new Date(r.data + 'T00:00:00');
        if (dataEstudo < hoje && desempenho < 100) alertas++;
    });

    const media = registrosGlobais.length > 0 ? Math.round(somaDesempenho / registrosGlobais.length) : 0;
    
    document.getElementById('dash-total').textContent = registrosGlobais.length;
    document.getElementById('dash-concluidos').textContent = concluidos;
    document.getElementById('dash-alerta').textContent = alertas;
    document.getElementById('dash-desempenho').textContent = `${media}%`;
}

function abrirModal(id = null) {
    modal.classList.add('active');
    formRegistro.reset();
    
    if (id) {
        document.getElementById('modal-title').textContent = 'Editar';
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
        document.getElementById('modal-title').textContent = 'Novo';
        document.getElementById('registro-id').value = '';
        document.getElementById('data').value = new Date().toISOString().split('T')[0];
    }
}

function fecharModal() { modal.classList.remove('active'); }

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

    if (payload.qtd_erros > payload.qtd_questoes) {
        alert('Erros não podem ser maiores que o total de questões.');
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/registros/${id}` : `${API_URL}/registros`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) { fecharModal(); carregarRegistros(); } else { alert('Erro ao salvar'); }
    } catch (err) { console.error(err); }
});

async function excluirRegistro(id) {
    if (!confirm('Deseja excluir?')) return;
    try {
        const res = await fetch(`${API_URL}/registros/${id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) carregarRegistros();
    } catch (err) { console.error(err); }
}

carregarRegistros();
