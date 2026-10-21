document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro ao logar');

        localStorage.setItem('jornada_token', data.token);
        localStorage.setItem('jornada_nome', data.nome);
        
        // Redireciona para a versão desktop ou mobile dependendo da tela
        if (window.innerWidth <= 768) {
            window.location.href = '/m/';
        } else {
            window.location.href = '/';
        }
    } catch (err) {
        errorMsg.textContent = err.message;
    }
});
