// ============================================================
// DASHBOARD MODULE
// ============================================================

async function renderDashboard(container) {
    try {
        const stats = await Store.getDashboardStats();
        container.innerHTML = `
        <div class="module-header">
            <h1>Dashboard</h1>
            <p class="module-subtitle">Operations overview — AtlisPoint Aero Group</p>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card" onclick="navigateTo('missions')">
                <div class="kpi-icon kpi-blue">
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                </div>
                <div class="kpi-data">
                    <div class="kpi-value">${stats.activeMissions}</div>
                    <div class="kpi-label">Active Missions</div>
                </div>
            </div>
            <div class="kpi-card" onclick="navigateTo('pipeline')">
                <div class="kpi-icon kpi-green">
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9z"/></svg>
                </div>
                <div class="kpi-data">
                    <div class="kpi-value">${formatCurrency(stats.pipelineValue)}</div>
                    <div class="kpi-label">Pipeline Value (${stats.pipelineCount} leads)</div>
                </div>
            </div>
            <div class="kpi-card" onclick="navigateTo('crew')">
                <div class="kpi-icon kpi-purple">
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                </div>
                <div class="kpi-data">
                    <div class="kpi-value">${stats.availableCrew} / ${stats.totalCrew}</div>
                    <div class="kpi-label">Crew Available</div>
                </div>
            </div>
            <div class="kpi-card" onclick="navigateTo('invoicing')">
                <div class="kpi-icon kpi-amber">
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1z"/></svg>
                </div>
                <div class="kpi-data">
                    <div class="kpi-value">${formatCurrency(stats.pendingInvoiceTotal)}</div>
                    <div class="kpi-label">Pending Invoices (${stats.pendingInvoices})</div>
                </div>
            </div>
        </div>

        <!-- Global Operations Map -->
        <div class="card map-card">
            <div class="card-header">
                <h3>Global Operations</h3>
                <div class="map-legend">
                    <span><span class="lg-dot lg-active"></span>Active / dispatched</span>
                    <span><span class="lg-dot lg-planned"></span>Planned</span>
                    <span class="map-hint">Scroll to zoom · drag to pan</span>
                </div>
            </div>
            <div class="card-body map-body">
                <div id="world-map" class="world-map"></div>
                <div id="map-tooltip" class="map-tooltip"></div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <h3>Recent Missions</h3>
                    <button class="btn btn-sm" onclick="navigateTo('missions')">View All</button>
                </div>
                <div class="card-body">
                    ${stats.recentMissions.length === 0 ? '<p class="text-muted">No missions yet.</p>' :
                    stats.recentMissions.map(m => `
                        <div class="activity-item">
                            <div class="activity-icon activity-${m.type?.toLowerCase() || 'ferry'}">
                                ${m.type === 'Ferry' ? '&#9992;' : m.type === 'Repossession' ? '&#128274;' : m.type === 'Technical Audit' ? '&#128269;' : '&#9745;'}
                            </div>
                            <div class="activity-details">
                                <div class="activity-title">${m.type}: ${m.aircraft || m.tailNumber || 'TBD'}</div>
                                <div class="activity-meta">${m.clientName || '—'} &middot; ${m.departure || '?'} → ${m.destination || '?'}</div>
                            </div>
                            <div>${statusBadge(m.status)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Pipeline</h3>
                    <button class="btn btn-sm" onclick="navigateTo('pipeline')">View All</button>
                </div>
                <div class="card-body">
                    ${stats.recentPipeline.length === 0 ? '<p class="text-muted">No leads yet.</p>' :
                    stats.recentPipeline.map(p => `
                        <div class="activity-item">
                            <div class="activity-details">
                                <div class="activity-title">${p.clientName}</div>
                                <div class="activity-meta">${p.missionType || 'General'} &middot; ${formatCurrency(p.estimatedValue)} &middot; ${p.probability}% probability</div>
                            </div>
                            <div>${statusBadge(p.stage)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        `;

        // Initialise the live world map (defined in worldmap.js)
        if (typeof initWorldMap === 'function') { initWorldMap(); }
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error loading dashboard</h2><p>${err.message}</p></div>`;
    }
}
