require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Use a chave Service Role
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve os arquivos HTML/CSS/JS

// Middleware de Autenticação
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Sessão expirada ou inválida.' });
        req.user = user;
        next();
    });
}

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('jornada_usuarios')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) return res.status(401).json({ error: 'Usuário não encontrado.' });
        if (user.password !== password) return res.status(401).json({ error: 'Senha incorreta.' }); // Em prod, use bcrypt.compare

        const token = jwt.sign({ id: user.id, nome: user.nome }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, nome: user.nome });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rotas de Registros (Protegidas)
app.get('/api/registros', autenticarToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('jornada_registros')
            .select('*')
            .eq('usuario_id', req.user.id)
            .order('data', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar registros.' });
    }
});

app.post('/api/registros', autenticarToken, async (req, res) => {
    const { materia, conteudo, data, qtd_questoes, qtd_erros } = req.body;
    try {
        const { data: novo, error } = await supabase
            .from('jornada_registros')
            .insert([{ usuario_id: req.user.id, materia, conteudo, data, qtd_questoes, qtd_erros }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(novo);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar registro.' });
    }
});

app.put('/api/registros/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { materia, conteudo, data, qtd_questoes, qtd_erros } = req.body;
    try {
        const { data: atualizado, error } = await supabase
            .from('jornada_registros')
            .update({ materia, conteudo, data, qtd_questoes, qtd_erros })
            .eq('id', id)
            .eq('usuario_id', req.user.id) // Garante que o usuário só edite o próprio registro
            .select()
            .single();

        if (error) throw error;
        res.json(atualizado);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar registro.' });
    }
});

app.delete('/api/registros/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('jornada_registros')
            .delete()
            .eq('id', id)
            .eq('usuario_id', req.user.id);

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir registro.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
