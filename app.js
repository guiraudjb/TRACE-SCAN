let currentProjectId = null;
let scanner = null;
let wakeLock = null;
let isSortedAlphabetically = false;

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
        scanner = new Html5Qrcode("reader", { 
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128
            ] 
        });
    }
    try {
        await scanner.start(
            { facingMode: "environment" },
            { 
                fps: 10, 
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    return { 
                        width: Math.floor(viewfinderWidth * 0.8), 
                        height: Math.floor(viewfinderHeight * 0.3) 
                    };
                } 
            },
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
        updateScanUI(StorageManager.getProject(currentProjectId));
    } else if (result.isDuplicate) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        notify("Meuble déjà présent dans la liste", true);
    }
}

// Construction de l'interface avec le bouton d'édition des commentaires
function updateScanUI(project) {
    document.getElementById('scan-counter').textContent = project.items.length;
    const list = document.getElementById('scanned-items');
    list.innerHTML = '';
    
    let displayItems = project.items.slice(); 
    if (isSortedAlphabetically) {
        displayItems.sort((a, b) => a.code.localeCompare(b.code));
    } else {
        displayItems.reverse(); 
    }
    
    displayItems.forEach(item => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        
        const textSpan = document.createElement('span');
        textSpan.style.wordBreak = 'break-all';
        // Affiche une icône et le texte si un commentaire existe
        textSpan.textContent = item.code + (item.comment ? ` 💬 (${item.comment})` : '');
        
        // Création du bouton d'édition
        const btnEdit = document.createElement('button');
        btnEdit.className = 'fr-btn fr-btn--tertiary fr-btn--sm fr-icon-edit-line';
        btnEdit.title = 'Ajouter/Modifier un commentaire';
        btnEdit.style.marginLeft = '10px';
        btnEdit.style.flexShrink = '0';
        
        // Logique de modification via prompt
        btnEdit.onclick = () => {
            const newComment = prompt(`Commentaire pour l'article ${item.code} :`, item.comment || "");
            if (newComment !== null) {
                StorageManager.updateComment(currentProjectId, item.code, newComment.trim());
                updateScanUI(StorageManager.getProject(currentProjectId)); // Rafraîchir l'affichage
            }
        };
        
        li.appendChild(textSpan);
        li.appendChild(btnEdit);
        list.appendChild(li);
    });
}

function renderProjectList() {
    const container = document.getElementById('project-list');
    const projects = StorageManager.getProjects();
    container.innerHTML = '';
    
    if (projects.length === 0) {
        container.innerHTML = `<p style="text-align:center; color: var(--text-mention-grey);">Aucun projet en cours</p>`;
        return;
    }

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'fr-card fr-mb-2w';
        
        const body = document.createElement('div');
        body.className = 'fr-card__body';
        
        const content = document.createElement('div');
        content.className = 'fr-card__content';
        
        const title = document.createElement('h3');
        title.className = 'fr-card__title';
        title.textContent = p.name;
        
        const desc = document.createElement('p');
        desc.className = 'fr-card__desc';
        desc.textContent = `${p.items.length} article(s) scanné(s)`;
        
        const end = document.createElement('div');
        end.className = 'fr-card__end fr-mt-2w';
        end.style.display = 'flex';
        end.style.gap = '10px';
        
        const btnOpen = document.createElement('button');
        btnOpen.className = 'fr-btn fr-btn--sm';
        btnOpen.textContent = 'Ouvrir';
        btnOpen.onclick = () => startScanner(p.id);
        
        const btnDel = document.createElement('button');
        btnDel.className = 'fr-btn fr-btn--secondary fr-btn--sm fr-icon-delete-line';
        btnDel.title = 'Supprimer';
        btnDel.onclick = () => confirmDelete(p.id);
        
        end.appendChild(btnOpen);
        end.appendChild(btnDel);
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(end);
        body.appendChild(content);
        card.appendChild(body);
        container.appendChild(card);
    });
}

function confirmDelete(id) {
    if (confirm("Supprimer cet inventaire ?")) {
        StorageManager.deleteProject(id);
        renderProjectList();
    }
}

// Fonction de secours si le navigateur ne supporte pas le partage
function fallbackDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- GESTION DE L'EXPORT ET DU PARTAGE ---
    // --- GESTION DE L'EXPORT (MÉTHODE ROBUSTE) ---
    document.getElementById('btn-export-csv').addEventListener('click', () => {
        const p = StorageManager.getProject(currentProjectId);
        
        // 1. Préparation du corps du mail
        const commentsText = p.items
            .filter(i => i.comment && i.comment.trim() !== "")
            .map(i => `- ${i.code} : ${i.comment}`)
            .join("\n");
            
        const emailBody = commentsText 
            ? `Bonjour,\n\nVeuillez trouver ci-joint l'inventaire "${p.name}".\n\nCommentaires relevés lors du scan :\n${commentsText}\n\n(Pensez à joindre le fichier CSV qui vient d'être téléchargé sur votre appareil)`
            : `Bonjour,\n\nVeuillez trouver ci-joint l'inventaire "${p.name}".\n\nAucun commentaire particulier n'a été saisi lors de ce scan.\n\n(Pensez à joindre le fichier CSV qui vient d'être téléchargé sur votre appareil)`;

        // 2. Génération du fichier CSV
        const csvContent = "Code_Inventaire,Commentaire\n" + 
            p.items.map(i => `"${i.code}","${(i.comment || '').replace(/"/g, '""')}"`).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `Inventaire_${p.name.replace(/ /g, '_')}.csv`;

        // 3. Téléchargement forcé du fichier (100% fiable)
        fallbackDownload(blob, fileName);
        notify("Fichier téléchargé. Ouverture de l'email...");

        // 4. Ouverture de l'application mail après un court délai
        setTimeout(() => {
            const subject = encodeURIComponent(`Export Inventaire : ${p.name}`);
            const body = encodeURIComponent(emailBody);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }, 1000); // Laisse 1 seconde au téléchargement pour se lancer
    });
    
    document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('input-file-csv').click());

    document.getElementById('input-file-csv').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            let lines = text.split(/\r?\n/).map(line => line.trim().replace(/^"|"$/g, '')).filter(line => line.length > 0);
            if (lines.length > 0 && lines[0].toLowerCase().includes("code")) lines.shift(); 
            if (lines.length > 0) {
                StorageManager.importCSVProject(file.name, lines);
                notify(`Projet créé avec ${lines.length} article(s).`);
                renderProjectList();
            }
            e.target.value = ''; 
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        const data = StorageManager.getBackupData();
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TRACE_SCAN_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('btn-import-db').addEventListener('click', () => document.getElementById('input-file-import').click());
    
    document.getElementById('btn-toggle-sort').addEventListener('click', (e) => {
        isSortedAlphabetically = !isSortedAlphabetically;
        // Mise à jour du texte du bouton selon l'état
        e.target.textContent = isSortedAlphabetically ? "Trier : Récent" : "Trier : A-Z";
        if (currentProjectId) updateScanUI(StorageManager.getProject(currentProjectId));
    });

    document.getElementById('input-file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (StorageManager.importBackup(event.target.result)) {
                notify("Import réussi");
                renderProjectList();
            } else notify("Fichier invalide", true);
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-new-project').addEventListener('click', () => {
        const name = prompt("Nom de l'emplacement (optionnel) :");
        if (name !== null) startScanner(StorageManager.createProject(name).id);
    });

    document.getElementById('btn-back').addEventListener('click', () => showView('view-home'));

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentProjectId) toggleWakeLock(true);
    });

    renderProjectList();
});
