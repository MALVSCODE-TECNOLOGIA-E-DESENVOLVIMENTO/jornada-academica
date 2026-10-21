const API_URL = '/api';
let token = localStorage.getItem('jornada_token');
let registrosGlobais = [];

if (!token) {
    window.location.href = '/login/';
}

const formRegistro = document.getElementById('form-registro');
const modal = document.getElementById('modal-form');
const listContainer = document.getElementById('list-container');

function logout() {
    localStorage.removeItem('jornada_token');
    localStorage.removeItem('jornada_nome');
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
    } catch (err) {
        console.error('Erro ao carregar:', err);
    }
}

function preencherFiltroMaterias() {
    const select = document.getElementById('filter-materia');
    const materiasUnicas = [...new Set(registrosGlobais.map(r => r.materia))].sort();
    select.innerHTML = '<option value="">Matéria (Todas)</option>';
    materiasUnicas.forEach(m => {
        select.innerHTML += `<option value="${m}">${m}</option>`;
    });
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

// Renderização em formato de Cards para Mobile
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
        const cardClass = situacao.texto === 'ÓTIMO' ? 'row-otimo' : '';

        return `
            <div class="mobile-card ${cardClass}">
                <div class="mc-header">
                    <strong>${r.materia}</strong>
                    <span class="badge ${situacao.classe}">${situacao.texto}</span>
                </div>
                <div class="mc-body">
                    <p><strong>Conteúdo:</strong> ${r.conteudo}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                </div>
                <div class="mc-actions">
                    <button class="action-btn btn-edit" onclick="abrirModal('${r.id}')">Editar</button>
                    <button class="action-btn btn-delete" onclick="excluirRegistro('${r.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function atualizarDashboard() {
    const total = registrosGlobais.length;
    let concluidos = 0, revisao = 0, somaDesempenho = 0;

    registrosGlobais.forEach(r => {
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        somaDesempenho += desempenho;

        if (desempenho === 100) concluidos++;
        if (desempenho < 100) revisao++;
    });

    const mediaDesempenho = total > 0 ? Math.round(somaDesempenho / total) : 0;

    document.getElementById('dash-total').textContent = total;
    document.getElementById('dash-concluidos').textContent = concluidos;
    document.getElementById('dash-revisao').textContent = revisao;
    document.getElementById('dash-desempenho').textContent = `${mediaDesempenho}%`;
}

function abrirModalRevisao() {
    const revisaoBody = document.getElementById('revisao-body');
    const revisar = registrosGlobais.filter(r => {
        const desempenho = calcularDesempenho(r.qtd_questoes, r.qtd_erros);
        return desempenho < 100;
    });

    if (revisar.length === 0) {
        revisaoBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#6B7280;">Nenhum conteúdo pendente.</td></tr>`;
    } else {
        revisaoBody.innerHTML = revisar.map(r => `
            <tr>
                <td>${r.materia}</td>
                <td>${r.conteudo}</td>
                <td>${new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            </tr>
        `).join('');
    }
    document.getElementById('modal-revisao').classList.add('active');
}

function fecharModalRevisao() {
    document.getElementById('modal-revisao').classList.remove('active');
}

function abrirModal(id = null) {
    modal.classList.add('active');
    formRegistro.reset();
    document.getElementById('desempenho_calculado').value = '';
    
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
            calcularDesempenhoModal();
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

function calcularDesempenhoModal() {
    const qtd = parseInt(document.getElementById('qtd_questoes').value) || 0;
    const erros = parseInt(document.getElementById('qtd_erros').value) || 0;
    const input = document.getElementById('desempenho_calculado');
    
    if (qtd > 0) {
        const calc = Math.round(((qtd - erros) / qtd) * 100);
        input.value = `${calc}% (${calc === 100 ? 'ÓTIMO' : calc >= 60 ? 'BOM' : 'RUIM'})`;
    } else {
        input.value = '';
    }
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

    if (payload.qtd_erros > payload.qtd_questoes) {
        alert('O número de erros não pode ser maior que o total de questões.');
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

        if (res.ok) { fecharModal(); carregarRegistros(); } else { alert('Erro ao salvar.'); }
    } catch (err) { console.error(err); }
});

async function excluirRegistro(id) {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
        const res = await fetch(`${API_URL}/registros/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) carregarRegistros();
    } catch (err) { console.error(err); }
}

carregarRegistros();
