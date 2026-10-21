// ── Anti-FOUC no próprio login: se já estiver logado, vai direto ao sistema ──
(function () {
    const token = localStorage.getItem('jornada_token');
    if (!token) return;

    const isMobileOrTablet = window.innerWidth <= 1024 ||
        ('ontouchstart' in window) ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    window.location.replace(isMobileOrTablet ? '/m/' : '/');
})();

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

        // Detecção ampla: tablets, celulares e dispositivos touch
        const isMobileOrTablet = window.innerWidth <= 1024 ||
            ('ontouchstart' in window) ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        window.location.href = isMobileOrTablet ? '/m/' : '/';
    } catch (err) {
        errorMsg.textContent = err.message;
    }
});
