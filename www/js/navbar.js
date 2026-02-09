/**
 * Bottom Navigation Component
 * Shared across all pages
 */

function createBottomNav(activePage = '') {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = `
        <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">
            <i class="fas fa-home"></i>
            <span>Início</span>
        </a>
        <a href="projetos.html" class="${activePage === 'projetos' ? 'active' : ''}">
            <i class="fas fa-building"></i>
            <span>Projetos</span>
        </a>
        <a href="relatorios.html" class="${activePage === 'relatorios' ? 'active' : ''}">
            <i class="fas fa-file-alt"></i>
            <span>Relatórios</span>
        </a>
        <a href="visitas.html" class="${activePage === 'visitas' ? 'active' : ''}">
            <i class="fas fa-calendar"></i>
            <span>Visitas</span>
        </a>
        <a href="configuracoes.html" class="${activePage === 'configuracoes' ? 'active' : ''}">
            <i class="fas fa-cog"></i>
            <span>Config</span>
        </a>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: space-around;
            padding: 8px 0;
            z-index: 1000;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }
        .bottom-nav a {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: #6c757d;
            font-size: 12px;
            padding: 4px 12px;
            transition: color 0.2s;
        }
        .bottom-nav a i {
            font-size: 20px;
            margin-bottom: 4px;
        }
        .bottom-nav a.active {
            color: #007bff;
        }
        .bottom-nav a:hover {
            color: #007bff;
        }
        body {
            padding-bottom: 70px;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(nav);
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const page = document.body.dataset.page || '';
        createBottomNav(page);
    });
} else {
    const page = document.body.dataset.page || '';
    createBottomNav(page);
}
