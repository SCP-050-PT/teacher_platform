(function () {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return;
        const user = JSON.parse(raw);

        const nameEl = document.getElementById('userName');
        if (nameEl) {
            nameEl.textContent = user.login || user.username || user.name || 'admin';
        }

        const isAdmin = user.role === 'admin' || user.role === 'methodist';
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = el.classList.contains('user-admin-btn')
                    ? 'inline-flex'
                    : '';
            });
        }
    } catch (e) {
        console.warn('auth-ui', e);
    }
})();