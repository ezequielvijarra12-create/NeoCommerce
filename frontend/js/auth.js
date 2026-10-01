// ============================================
// NeoCommerce - Gestión de Autenticación
// ============================================

const API_URL = 'http://localhost:3000/api';

// Utilidades
const showToast = (msg, type = 'info') => {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.className = 'toast ' + type, 3500);
};

const openModal = (id) => document.getElementById(id).classList.add('active');
const closeModal = (id) => document.getElementById(id).classList.remove('active');

// Sesión
const saveSession = (token, usuario) => {
    localStorage.setItem('neo_token', token);
    localStorage.setItem('neo_user', JSON.stringify(usuario));
};

const getSession = () => {
    const token = localStorage.getItem('neo_token');
    const user = localStorage.getItem('neo_user');
    return token && user ? { token, usuario: JSON.parse(user) } : null;
};

const clearSession = () => {
    localStorage.removeItem('neo_token');
    localStorage.removeItem('neo_user');
};

// Cargar roles en el select
const cargarRoles = async () => {
    try {
        const res = await fetch(`${API_URL}/auth/roles`);
        const roles = await res.json();
        const select = document.getElementById('regRol');
        select.innerHTML = '<option value="">Selecciona un rol</option>';
        roles.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.RolID;
            opt.textContent = r.NombreRol;
            opt.dataset.requiereCodigo = r.RequiereCodigo;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error cargando roles:', err);
    }
};

// Manejar visibilidad del campo código
document.addEventListener('DOMContentLoaded', () => {
    cargarRoles();

    const regRol = document.getElementById('regRol');
    regRol.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        const requiere = opt?.dataset.requiereCodigo === 'true';
        document.getElementById('codigoGroup').style.display = requiere ? 'block' : 'none';
        document.getElementById('regCodigo').required = requiere;
    });

    // Formulario LOGIN
    document.getElementById('formLogin').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'Error al iniciar sesión', 'error');
                return;
            }

            saveSession(data.token, data.usuario);
            showToast(`¡Bienvenido, ${data.usuario.nombre}!`, 'success');
            closeModal('modalLogin');
            e.target.reset();
            actualizarUIUsuario();
            mostrarDashboard(data.usuario);
        } catch (err) {
            showToast('Error de conexión con el servidor', 'error');
        }
    });

    // Formulario REGISTRO
    document.getElementById('formRegister').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombreCompleto: document.getElementById('regNombre').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            rolID: parseInt(document.getElementById('regRol').value),
            codigo: document.getElementById('regCodigo').value || null,
            telefono: document.getElementById('regTelefono').value || null
        };

        try {
            const res = await fetch(`${API_URL}/auth/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'Error al registrar', 'error');
                return;
            }

            showToast('¡Registro exitoso! Ya puedes iniciar sesión', 'success');
            closeModal('modalRegister');
            e.target.reset();
            document.getElementById('codigoGroup').style.display = 'none';
            setTimeout(() => openModal('modalLogin'), 800);
        } catch (err) {
            showToast('Error de conexión con el servidor', 'error');
        }
    });
});