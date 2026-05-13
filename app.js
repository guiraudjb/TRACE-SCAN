let currentProjectId = null;
let scanner = null;
let wakeLock = null;

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if (viewId === 'view-home') {
        stopScanner();
        renderProjectList();
    }
}

function notify(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = isError ? 'show error' : 'show';
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- GESTION ANTI-VEILLE (WAKE LOCK) ---
async function toggleWakeLock(active) {
    if (!('wakeLock' in navigator)) return;
    try {
        if (active) {
            wakeLock = await navigator.wakeLock.request('screen');
        } else if (wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }
    } catch (err) { console.error("WakeLock Error:", err); }
}

// --- LOGIQUE SCANNER ---
async function startScanner(projectId) {
    currentProjectId = projectId;
    const project = StorageManager.getProject(projectId);
    document.getElementById('active-project-name').textContent = project.name;
    updateScanUI(project);

    showView('view-scan');
    toggleWakeLock(true);

    if (!scanner) {
        scanner = new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
    }

    try {
        await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess
        );
    } catch (e) { notify("Erreur caméra", true); }
}

async function stopScanner() {
    if (scanner && scanner.isScanning) {
        await scanner.stop();
    }
    toggleWakeLock(false);
}

function onScanSuccess(decodedText) {
    const result = StorageManager.addItemToProject(currentProjectId, decodedText);
    
    if (result.success) {
        if (navigator.vibrate) navigator.vibrate(100);
        const project = StorageManager.getProject(currentProjectId);
        updateScanUI(project);
    } else if (result.isDuplicate) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        notify("Matériel déjà présent dans la liste", true);
    }
}

function updateScanUI(project) {
    document.getElementById('scan-counter').textContent = project.items.length;
    const list = document.getElementById('scanned-items');
    list.innerHTML = project.items.slice().reverse().map(item => `<li>${item}</li>`).join('');
}

// --- AFFICHAGE ACCUEIL ---
function renderProjectList() {
    const container = document.getElementById('project-list');
    const projects = StorageManager.getProjects();
    
    if (projects.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#666;">Aucun projet en cours</p>`;
        return;
    }

    container.innerHTML = projects.map(p => `
        <div class="card">
            <div>
                <strong>${p.name}</strong><br>
                <small>${p.items.length} article(s)</small>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="btn btn-primary btn-sm" onclick="startScanner('${p.id}')">Ouvrir</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function confirmDelete(id) {
    if (confirm("Supprimer cet inventaire ?")) {
        StorageManager.deleteProject(id);
        renderProjectList();
    }
}

// --- INITIALISATION ET ÉVÉNEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('btn-export-csv').addEventListener('click', () => {
        const p = StorageManager.getProject(currentProjectId);
        const content = "Code_QR\n" + p.items.join("\n");
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inventaire_${p.name.replace(/ /g, '_')}.csv`;
        a.click();
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        const data = StorageManager.getBackupData();
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TRACE_SCAN_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('btn-import-db').addEventListener('click', () => {
        document.getElementById('input-file-import').click();
    });

    document.getElementById('input-file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (StorageManager.importBackup(event.target.result)) {
                notify("Import réussi");
                renderProjectList();
            } else {
                notify("Fichier invalide", true);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-new-project').addEventListener('click', () => {
        const name = prompt("Nom de l'emplacement (optionnel) :");
        const p = StorageManager.createProject(name);
        startScanner(p.id);
    });

    document.getElementById('btn-back').addEventListener('click', () => showView('view-home'));

    // Réactivation de l'anti-veille si l'app revient au premier plan
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentProjectId) {
            toggleWakeLock(true);
        }
    });

    // Rendu initial
    renderProjectList();
});
