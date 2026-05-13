const TRACE_DB_KEY = 'trace_scan_projects_v1';

const StorageManager = {
    getProjects() {
        const data = localStorage.getItem(TRACE_DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveAll(projects) {
        localStorage.setItem(TRACE_DB_KEY, JSON.stringify(projects));
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
        
        if (project.items.includes(code)) {
            return { success: false, isDuplicate: true };
        }
        
        project.items.push(code);
        this.saveAll(projects);
        return { success: true, count: project.items.length };
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
    }
};

// Créer un nouveau projet à partir d'une liste brute de codes (Import CSV)
    importCSVProject(fileName, itemsArray) {
        const projects = this.getProjects();
        const newProject = {
            id: "csv_" + Date.now().toString(),
            name: fileName.replace('.csv', '') + " (Importé)",
            timestamp: new Date().toISOString(),
            // On s'assure de ne pas importer de doublons depuis le CSV
            items: [...new Set(itemsArray)] 
        };
        projects.push(newProject);
        this.saveAll(projects);
        return true;
    }
