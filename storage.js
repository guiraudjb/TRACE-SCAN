/**
 * TRACE_SCAN - Module de Persistance
 * Gère le stockage local, l'intégrité des données et les exports.
 */

const TRACE_DB_KEY = 'trace_scan_projects_v1';

const StorageManager = {
    // Récupère la liste complète des projets
    getProjects() {
        const data = localStorage.getItem(TRACE_DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Sauvegarde la collection de projets
    saveAll(projects) {
        localStorage.setItem(TRACE_DB_KEY, JSON.stringify(projects));
    },

    // Initialise un nouveau projet d'inventaire
    createProject(customName = "") {
        const projects = this.getProjects();
        const newProject = {
            id: Date.now().toString(),
            name: customName || `Inventaire du ${new Date().toLocaleString('fr-FR')}`,
            timestamp: new Date().toISOString(),
            items: []
        };
        projects.push(newProject);
        this.saveAll(projects);
        return newProject;
    },

    // Récupère un projet par son ID
    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    // Ajoute un code scanné avec détection de doublon (Évolution 4)
    addItemToProject(projectId, code) {
        const projects = this.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) return { success: false, message: "Projet introuvable" };
        
        // Vérification stricte des doublons au sein du projet
        if (project.items.includes(code)) {
            return { success: false, isDuplicate: true };
        }
        
        project.items.push(code);
        this.saveAll(projects);
        return { success: true, count: project.items.length };
    },

    // Supprime un projet après confirmation
    deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id !== id);
        this.saveAll(projects);
    },

    // Prépare le JSON pour l'export de sauvegarde complet
    getBackupData() {
        return JSON.stringify(this.getProjects(), null, 2);
    },

    // Intègre un fichier de sauvegarde JSON
    importBackup(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) return false;

            const current = this.getProjects();
            const currentIds = new Set(current.map(p => p.id));

            imported.forEach(p => {
                // Gestion des collisions d'ID (crée une copie si l'ID existe déjà)
                if (currentIds.has(p.id)) {
                    p.id = "import_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                    p.name += " (Copie)";
                }
                current.push(p);
            });

            this.saveAll(current);
            return true;
        } catch (e) {
            return false;
        }
    }
};
