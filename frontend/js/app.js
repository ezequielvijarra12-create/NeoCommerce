// ============================================
// NeoCommerce - Lógica Principal de la App
// ============================================

const switchView = (viewName) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('active');
};

// Actualizar la UI según sesión
const actualizarUIUsuario = () => {
    const sesion = getSession();
    const userInfo = document.getElementById('userInfo');
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');

    if (sesion) {
        btnLogin.style.display = 'none';
        btnRegister.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('userBadge').textContent =
            `${sesion.usuario.nombre} • ${sesion.usuario.rol}`;
    } else {
        btnLogin.style.display = 'block';
        btnRegister.style.display = 'block';
        userInfo.style.display = 'none';
    }
};

// Mostrar dashboard según rol
const mostrarDashboard = (usuario) => {
    const title = document.getElementById('dashboardTitle');
    const content = document.getElementById('dashboardContent');
    title.textContent = `PANEL ${usuario.rol.toUpperCase()}`;

    const dashboards = {
        'Administrador': [
            { titulo: 'Usuarios Activos', num: '24', desc: 'Total en el sistema' },
            { titulo: 'Ventas del Día', num: '$12,450', desc: 'Ingresos totales' },
            { titulo: 'Productos', num: '156', desc: 'En catálogo' },
            { titulo: 'Proveedores', num: '8', desc: 'Registrados' }
        ],
        'Gerente': [
            { titulo: 'Reporte Mensual', num: '$248K', desc: 'Ventas del mes' },
            { titulo: 'Stock Crítico', num: '12', desc: 'Productos por reponer' },
            { titulo: 'Empleados', num: '18', desc: 'Cajeros y reponedores' }
        ],
        'Cajero': [
            { titulo: 'Ventas Hoy', num: '42', desc: 'Transacciones realizadas' },
            { titulo: 'Monto Total', num: '$3,280', desc: 'Caja actual' },
            { titulo: 'Turno', num: 'Activo', desc: 'Estado del turno' }
        ],
        'Repositor': [
            { titulo: 'Productos Bajo Stock', num: '15', desc: 'Requieren reposición' },
            { titulo: 'Reposiciones Hoy', num: '8', desc: 'Completadas' },
            { titulo: 'Movimientos', num: '23', desc: 'Registrados hoy' }
        ],
        'Proveedor': [
            { titulo: 'Pedidos Pendientes', num: '6', desc: 'Por entregar' },
            { titulo: 'Productos Surtidos', num: '45', desc: 'En catálogo' },
            { titulo: 'Entregas Mes', num: '28', desc: 'Completadas' }
        ]
    };

    const cards = dashboards[usuario.rol] || dashboards['Cajero'];
    content.innerHTML = cards.map(c => `
        <div class="dashboard-card">
            <h3>${c.titulo}</h3>
            <div class="big-number">${c.num}</div>
            <p style="color: var(--text-secondary); margin-top: 8px;">${c.desc}</p>
        </div>
    `).join('');

    switchView('dashboard');
};

// Cargar productos (simulados)
const cargarProductos = async () => {
    const grid = document.getElementById('productsGrid');
    // Datos simulados (podrías consultar la API)
    const productos = [
        { nombre: 'Laptop Quantum X1', precio: 2499.99, stock: 15, icon: '💻' },
        { nombre: 'Drone Nebula Pro', precio: 1299.50, stock: 8, icon: '🚁' },
        { nombre: 'Auriculares Void 360', precio: 349.99, stock: 25, icon: '🎧' },
        { nombre: 'Smartwatch Cyber S', precio: 599.99, stock: 12, icon: '⌚' },
        { nombre: 'Teclado Plasma RGB', precio: 189.99, stock: 30, icon: '⌨️' },
        { nombre: 'Mouse Holográfico', precio: 129.99, stock: 40, icon: '🖱️' }
    ];

    grid.innerHTML = productos.map(p => `
        <div class="product-card">
            <div class="product-img">${p.icon}</div>
            <h3>${p.nombre}</h3>
            <div class="product-price">$${p.precio.toFixed(2)}</div>
            <div class="product-stock">Stock: ${p.stock} unidades</div>
        </div>
    `).join('');
};

// Partículas
const crearParticulas = () => {
    const container = document.getElementById('particles');
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 8 + 5) + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        if (Math.random() > 0.5) {
            p.style.background = '#b026ff';
            p.style.boxShadow = '0 0 10px #b026ff';
        }
        container.appendChild(p);
    }
};

// Eventos globales
document.addEventListener('DOMContentLoaded', () => {
    crearParticulas();
    actualizarUIUsuario();

    // Restaurar vista si hay sesión
    const sesion = getSession();
    if (sesion) mostrarDashboard(sesion.usuario);

    // Navegación
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view === 'productos') cargarProductos();
            switchView(view);
        });
    });

    // Abrir modales
    document.getElementById('btnLogin').addEventListener('click', () => openModal('modalLogin'));
    document.getElementById('btnRegister').addEventListener('click', () => openModal('modalRegister'));
    document.getElementById('heroLogin').addEventListener('click', () => openModal('modalLogin'));
    document.getElementById('heroRegister').addEventListener('click', () => openModal('modalRegister'));

    // Enlaces entre modales
    document.getElementById('linkToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('modalLogin');
        openModal('modalRegister');
    });
    document.getElementById('linkToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('modalRegister');
        openModal('modalLogin');
    });

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', () => closeModal(el.dataset.close));
    });
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('active');
        });
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        clearSession();
        showToast('Sesión cerrada', 'info');
        actualizarUIUsuario();
        switchView('home');
    });

    // Cards de rol en home
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            openModal('modalRegister');
        });
    });
});

// Exponer al scope global (usado desde auth.js)
window.switchView = switchView;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.getSession = getSession;
window.clearSession = clearSession;
window.saveSession = saveSession;
window.actualizarUIUsuario = actualizarUIUsuario;
window.mostrarDashboard = mostrarDashboard;