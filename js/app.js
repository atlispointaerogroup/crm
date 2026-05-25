// =======================================================
// MAIN APPLICATION CONTROLLER
// =======================================================

let currentModule = 'dashboard';
let currentUser = null;

// ---------- Authentication ----------
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    auth.signInWithEmailAndPassword(email, password)
        .then(() => { /* onAuthStateChanged handles the rest */ })
        .catch(err => {
            errorEl.textContent = 'Invalid email or password.';
            btn.disabled = false;
            btn.textContent = 'Sign In';
        });
}

function handleLogout() {
    auth.signOut();
}

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        const initials = user.email.substring(0, 2).toUpperCase();
        document.getElementById('user-avatar').textContent = initials;
        document.getElementById('user-menu-header').textContent = user.email;
        // Seed demo data on first use
        Store.seedDemoData().then(() => navigateTo('dashboard'));
    } else {
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// ---------- Navigation ----------
function navigateTo(module) {
    currentModule = module;
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.module === module);
    });
    // Render module
    const content = document.getElementById('main-content');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';

    switch (module) {
        case 'dashboard': renderDashboard(content); break;
        case 'pipeline': renderPipeline(content); break;
        case 'clients': renderClients(content); break;
        case 'missions': renderMissions(content); break;
        case 'crew': renderCrew(content); break;
        case 'invoicing': renderInvoicing(content); break;
        case 'documents': renderDocuments(content); break;
        default: content.innerHTML = '<div class="module-empty"><h2>Module not found</h2></div>';
    }
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// ---------- Sidebar ----------
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ---------- User Menu ----------
function toggleUserMenu() {
    document.getElementById('user-menu').classList.toggle('show');
}
document.addEventListener('click', e => {
    if (!e.target.closest('.topbar-user')) {
        document.getElementById('user-menu').classList.remove('show');
    }
});

// ---------- Global Search ----------
function handleGlobalSearch(query) {
    if (!query || query.length < 2) return;
    // Future: implement cross-module search
}

// ---------- Modal ----------
function openModal(title, bodyHTML {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.add('show');
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-overlay').classList.remove('show');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

// ---------- Toast Notifications ----------
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ---------- Utility ----------
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return 'â';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status) {
    const colors = {
        active: 'badge-green', available: 'badge-green', paid: 'badge-green', completed: 'badge-green', signed: 'badge-green',
        planning: 'badge-blue', sent: 'badge-blue', pending: 'badge-yellow', draft: 'badge-yellow',
        on_mission: 'badge-purple', 'Proposal Sent': 'badge-blue', 'Discovery': 'badge-yellow', 'Negotiation': 'badge-purple',
        'Won': 'badge-green', 'Lost': 'badge-red',
        unavailable: 'badge-red', overdue: 'badge-red', cancelled: 'badge-red', expired: 'badge-red',
    };
    const cls = colors[status] || 'badge-gray';
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<span class="badge ${cls}">${label}</span>`;
}

function showSettings() {
    openModal('Settings', `
        <div class="settings-form">
            <p>Manage your account settings, notification preferences, and CRM configuration.</p>
            <div class="form-group">
                <label>Display Name</label>
                <input type="text" value="${currentUser?.email || ''}" disabled>
            </div>
            <div class="form-group">
                <label>Change Password</label>
                <input type="password" placeholder="New password" id="settings-new-pw">
            </div>
            <button class="btn btn-primary" onclick="updatePassword()">Update Password</button>
        </div>
    `);
}

function updatePassword() {
    const pw = document.getElementById('settings-new-pw').value;
    if (pw.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    currentUser.updatePassword(pw)
        .then(() => { showToast('Password updated.'); closeModal(); })
        .catch(err => showToast(err.message, 'error'));
}

// ---------- Generic table builder ----------
function buildTable(columns, rows, actions) {
    if (rows.length === 0) {
        return '<div class="table-empty"><p>No records found.</p></div>';
    }
    let html = '<div class="table-wrapper"><table><thead><tr>';
    columns.forEach(col => { html += `<th>${col.label}</th>`; });
    if (actions) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            let val = row[col.key];
            if (col.format === 'currency') val = formatCurrency(val || 0);
            else if (col.format === 'date') val = formatDate(val);
            else if (col.format === 'status') val = statusBadge(val || 'unknown');
            else val = val || 'â';
            html += `<td>${val}</td>`;
        });
        if (actions) {
            html += '<td class="actions-cell">';
            html += actions(row);
            html += '</td>';
        }
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}
