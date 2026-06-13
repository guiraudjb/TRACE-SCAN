const TRACE_DB_KEY = 'trace_scan_projects_v1';

const StorageManager = {
    getProjects() {
        let data;
        try { data = localStorage.getItem(TRACE_DB_KEY); } catch (e) { return []; }
        let projects = data ? JSON.parse(data) : [];
        
        // Migration automatique des anciens scans vers le nouveau format objet
        projects = projects.map(p => {
            p.items = p.items.map(item => 
                typeof item === 'string' ? { code: item, comment: "" } : item
            );
            return p;
        });
        
        return projects;
    },

    saveAll(projects) {
        try {
            localStorage.setItem(TRACE_DB_KEY, JSON.stringify(projects));
        } catch (e) {
            console.error('Stockage indisponible (navigation privée ?)', e);
        }
    },

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

    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    addItemToProject(projectId, code) {
        const projects = this.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) return { success: false, message: "Projet introuvable" };
        
        if (project.items.find(i => i.code === code)) {
            return { success: false, isDuplicate: true };
        }
        
        project.items.push({ code: code, comment: "" });
        this.saveAll(projects);
        return { success: true, count: project.items.length };
    },

    updateComment(projectId, code, comment) {
        const projects = this.getProjects();
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const item = project.items.find(i => i.code === code);
            if (item) {
                item.comment = comment;
                this.saveAll(projects);
            }
        }
    },

    deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id !== id);
        this.saveAll(projects);
    },

    getBackupData() {
        return JSON.stringify(this.getProjects(), null, 2);
    },
    
    importBackup(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (!Array.isArray(imported)) return false;

            const current = this.getProjects();
            const currentIds = new Set(current.map(p => p.id));

            imported.forEach(p => {
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
    },

    importCSVProject(fileName, itemsArray) {
        const projects = this.getProjects();
        // Création d'objets pour chaque ligne importée
        const uniqueItems = [...new Set(itemsArray)].map(code => ({ code, comment: "" }));
        const newProject = {
            id: "csv_" + Date.now().toString(),
            name: fileName.replace('.csv', '') + " (Importé)",
            timestamp: new Date().toISOString(),
            items: uniqueItems 
        };
        projects.push(newProject);
        this.saveAll(projects);
        return true;
    }
};
