// API Service for Dashboard operations
const DashboardAPI = {
    async getProjects() {
        try {
            const res = await api.get('/projects');
            return res.data?.projects || res.projects || [];
        } catch (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
    },

    async createProject(projectData) {
        try {
            const res = await api.post('/projects', projectData);
            return res.data?.project || res.project;
        } catch (error) {
            throw new Error(error.message || 'Failed to create project');
        }
    },

    async updateProject(projectId, projectData) {
        try {
            const res = await api.put(`/projects/${projectId}`, projectData);
            return res.data?.project || res.project;
        } catch (error) {
            throw new Error(error.message || 'Failed to update project');
        }
    },

    async deleteProject(projectId) {
        return api.delete(`/projects/${projectId}`);
    },

    async getTasks() {
        try {
            const res = await api.get('/tasks');
            return res.data?.tasks || res.tasks || [];
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    },

    async createTask(taskData) {
        try {
            const res = await api.post('/tasks', taskData);
            return res.data?.task || res.task;
        } catch (error) {
            throw new Error(error.message || 'Failed to create task');
        }
    },

    async updateTask(taskId, taskData) {
        try {
            const res = await api.put(`/tasks/${taskId}`, taskData);
            return res.data?.task || res.task;
        } catch (error) {
            throw new Error(error.message || 'Failed to update task');
        }
    },

    async updateTaskStatus(taskId, status) {
        try {
            const res = await api.put(`/tasks/${taskId}`, { status });
            console.log('Update status response:', res);
            return res.data?.task || res.task;
        } catch (error) {
            console.error('API Error updating task status:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to update task status');
        }
    },

    async deleteTask(taskId) {
        return api.delete(`/tasks/${taskId}`);
    },

    async getTeams() {
        try {
            const res = await api.get('/teams');
            return res.data?.teams || res.teams || [];
        } catch (error) {
            console.error('Error fetching teams:', error);
            return [];
        }
    },

    async getTeam(teamId) {
        try {
            const res = await api.get(`/teams/${teamId}`);
            return res.data?.team || res.team;
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch team');
        }
    },

    async createTeam(teamData) {
        try {
            const res = await api.post('/teams', teamData);
            return res.data?.team || res.team;
        } catch (error) {
            throw new Error(error.message || 'Failed to create team');
        }
    },

    async updateTeam(teamId, teamData) {
        try {
            const res = await api.put(`/teams/${teamId}`, teamData);
            return res.data?.team || res.team;
        } catch (error) {
            throw new Error(error.message || 'Failed to update team');
        }
    },

    async addTeamMembers(teamId, memberIds) {
        try {
            const res = await api.put(`/teams/${teamId}`, { addMembers: memberIds });
            return res.data?.team || res.team;
        } catch (error) {
            throw new Error(error.message || 'Failed to add members');
        }
    },

    async removeTeamMembers(teamId, memberIds) {
        try {
            const res = await api.put(`/teams/${teamId}`, { removeMembers: memberIds });
            return res.data?.team || res.team;
        } catch (error) {
            throw new Error(error.message || 'Failed to remove members');
        }
    },

    async deleteTeam(teamId) {
        return api.delete(`/teams/${teamId}`);
    },

    async getNotifications() {
        try {
            const res = await api.get('/notifications');
            return res.data?.notifications || res.notifications || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },

    async markNotificationRead(notificationId) {
        try {
            const res = await api.put(`/notifications/${notificationId}/read`);
            return res.data?.notification || res.notification || null;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return null;
        }
    },

    async markAllNotificationsRead() {
        try {
            await api.put('/notifications/read-all');
            return true;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return false;
        }
    },

    async deleteNotification(notificationId) {
        try {
            await api.delete(`/notifications/${notificationId}`);
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    }
};

// Toast notification function
function showToast(message) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.userId = AuthService.getCurrentUser()?._id;
        this.checkInterval = null;
        this.isDropdownOpen = false;
        this.lastCheckTime = Date.now();
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        await this.loadNotifications();
        this.setupEventListeners();
        this.startPolling();
        this.isInitialized = true;
    }

    async loadNotifications() {
        try {
            const response = await DashboardAPI.getNotifications();

            this.notifications = response || [];
            this.unreadCount = this.notifications.filter(n => !n.read).length;

            this.updateBadge();
            this.updateDropdown();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = [];
            this.unreadCount = 0;
        }
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) {
            console.warn('Notification badge element not found');
            return;
        }

        // Recalculate unread count
        this.unreadCount = this.notifications.filter(n => !n.read).length;

        if (this.unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    updateDropdown() {
        const list = document.getElementById('notificationList');
        if (!list) {
            console.warn('Notification list element not found');
            return;
        }

        if (!this.notifications || this.notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
            return;
        }

        // Sort by createdAt descending (newest first)
        const sorted = [...this.notifications].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        list.innerHTML = sorted.map(notif => {
            const changedByName = notif.changedBy?.username || notif.changedBy?.fullName || notif.changedBy?.name || 'Someone';
            const isUnread = !notif.read;
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif._id}">
                    <div class="notification-title">${this.escapeHtml(notif.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notif.message)}</div>
                    <div class="notification-time">${this.formatTime(notif.createdAt)}</div>
                    ${notif.changedBy ? `<div style="font-size: 11px; color: #999; margin-top: 2px;">By: ${this.escapeHtml(changedByName)}</div>` : ''}
                </div>
            `;
        }).join('');

        // Add click event to mark individual notification as read
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                await this.markAsRead(id);
            });
        });
    }

    async markAsRead(id) {
        try {
            const notification = await DashboardAPI.markNotificationRead(id);
            if (notification) {
                const index = this.notifications.findIndex(n => n._id === id);
                if (index !== -1) {
                    this.notifications[index].read = true;
                    this.updateBadge();
                    this.updateDropdown();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const success = await DashboardAPI.markAllNotificationsRead();
            if (success) {
                this.notifications.forEach(n => n.read = true);
                this.updateBadge();
                this.updateDropdown();
                showToast('📬 All notifications marked as read');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        this.isDropdownOpen = !this.isDropdownOpen;
        dropdown.classList.toggle('show');

        if (this.isDropdownOpen) {
            this.updateDropdown();
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
            this.isDropdownOpen = false;
        }
    }

    setupEventListeners() {
        // Click on notification icon
        const icon = document.getElementById('notificationIcon');
        if (icon) {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        } else {
            console.warn('Notification icon not found');
        }

        // Click on mark all read button
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        } else {
            console.warn('Mark all read button not found');
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const container = document.querySelector('.notification-container');
            if (container && !container.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
        return date.toLocaleDateString();
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    async checkForChanges() {
        await this.loadNotifications();
    }

    startPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Check every 5 seconds
        // this.checkInterval = setInterval(() => {
        //     this.checkForChanges();
        // }, 5000);
    }

    stopPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Initialize notification system
let notificationSystem = null;

// State management
let appData = {
    projects: [],
    tasks: [],
    teams: []
};

let originalTasks = [];
let currentTab = "dashboard";

// Helper functions
function getProjectName(project) {
    if (!project) {
        return 'Unknown Project';
    }

    if (typeof project === 'object') {
        return project.name || 'Unknown Project';
    }

    const proj = appData.projects.find(
        p => p._id === project || p.id === project
    );

    return proj ? proj.name : 'Unknown Project';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Render functions
function renderDashboard() {
    const totalProjects = appData.projects.length;
    const totalTasks = appData.tasks.length;
    const completedTasks = appData.tasks.filter(t => t.status === "completed").length;
    const totalTeams = appData.teams.length;

    return `
        <div class="section-card">
            <div class="section-header">
                <h2><i class="fa-solid fa-gauge-high"></i> Dashboard Overview</h2>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 20px; margin-bottom: 32px;">
                <div style="background: #f3f0ff; border-radius: 24px; padding: 20px; text-align: center;">
                    <i class="fa-solid fa-diagram-project" style="font-size: 2rem; color:#764ba2;"></i>
                    <h3 style="margin: 12px 0 4px;">${totalProjects}</h3>
                    <p>Active Projects</p>
                </div>
                <div style="background: #fff0e6; border-radius: 24px; padding: 20px; text-align: center;">
                    <i class="fa-solid fa-tasks" style="font-size: 2rem; color:#e67e22;"></i>
                    <h3 style="margin: 12px 0 4px;">${totalTasks}</h3>
                    <p>Total Tasks</p>
                </div>
                <div style="background: #e0f2fe; border-radius: 24px; padding: 20px; text-align: center;">
                    <i class="fa-solid fa-check-circle" style="font-size: 2rem; color:#2ecc71;"></i>
                    <h3 style="margin: 12px 0 4px;">${completedTasks}</h3>
                    <p>Completed</p>
                </div>
                <div style="background: #f1e6ff; border-radius: 24px; padding: 20px; text-align: center;">
                    <i class="fa-solid fa-users" style="font-size: 2rem; color:#8e44ad;"></i>
                    <h3 style="margin: 12px 0 4px;">${totalTeams}</h3>
                    <p>Teams</p>
                </div>
            </div>
            <div style="margin-top: 10px;">
                <h3><i class="fa-regular fa-clock"></i> Recent Tasks</h3>
                <div class="tasks-table-wrapper">
                    <table class="tasks-table">
                        <thead>
                            <tr><th>Task</th><th>Project</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            ${appData.tasks.slice(0, 3).map(task => `
                                <tr>
                                    <td>${escapeHtml(task.title)}</td>
                                    <td>${escapeHtml(task.project?.name || 'Unknown Project')}</td>
                                    <td><span class="status-badge ${task.status === 'completed' ? 'completed' : (task.status === 'progress' ? 'progress' : 'pending')}">${task.status}</span></td>
                                </tr>
                            `).join('')}
                            ${appData.tasks.length === 0 ? '<tr><td colspan="3">No tasks available</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function getProjectPermissions(proj) {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return { canEdit: false, canDelete: false };

    const currentUserId = currentUser._id;

    const isProjectOwner = (proj.owner?._id || proj.owner) === currentUserId;

    const team = proj.team; // populated object from backend, or null
    const isTeamOwner = team && (team.owner?._id || team.owner) === currentUserId;
    const isTeamMember = team && Array.isArray(team.members) &&
        team.members.some(m => (m._id || m) === currentUserId);

    return {
        canEdit: isProjectOwner || isTeamOwner, // || isTeamMember
        canDelete: isProjectOwner || isTeamOwner
    };
}

function renderProjects() {
    return `
        <div class="section-card">
            <div class="section-header">
                <h2><i class="fa-solid fa-diagram-project"></i> Projects</h2>
                <button class="btn-primary" id="addProjectBtn"><i class="fa-solid fa-plus"></i> New Project</button>
            </div>
            <div class="projects-grid">
                ${appData.projects.map(proj => {
        const { canEdit, canDelete } = getProjectPermissions(proj);
        return `
                        <div class="project-card" data-id="${proj._id}">
                            <div class="project-title">${escapeHtml(proj.name)}</div>
                            <div class="project-desc">${escapeHtml(proj.description || 'No description')}</div>
                            <div class="badge">${proj.status || 'active'}</div>
                            ${proj.team ? `<span class="badge">TEAM PROJECT</span>` : ''}
                            <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
                                ${canEdit ? `<i class="fa-regular fa-pen-to-square edit-project" data-id="${proj._id}" style="cursor:pointer; color:#4a6fa5;"></i>` : ''}
                                ${canDelete ? `<i class="fa-regular fa-trash-can delete-project" data-id="${proj._id}" style="cursor:pointer; color:#a0517a;"></i>` : ''}
                                ${!canEdit && !canDelete ? `<span style="font-size: 12px; color: #888;">View only</span>` : ''}
                            </div>
                        </div>
                    `;
    }).join('')}
                ${appData.projects.length === 0 ? '<div class="empty-message">No projects yet. Click "New Project" to start!</div>' : ''}
            </div>
        </div>
    `;
}

function renderTasks() {
    const currentUser = AuthService.getCurrentUser();

    const currentProjectFilter = document.getElementById('taskFilterProject')?.value || '';
    const currentStatusFilter = document.getElementById('taskFilterStatus')?.value || '';

    return `
        <div class="section-card">
            <div class="section-header">
                <h2><i class="fa-solid fa-list-check"></i> Tasks</h2>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <select id="taskFilterProject" style="padding: 8px; border-radius: 8px; border: 1px solid #ddd;">
                        <option value="">All Projects</option>
                        ${appData.projects.map(p =>
        `<option value="${p._id}" ${p._id === currentProjectFilter ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('')}
                    </select>
                    <select id="taskFilterStatus" style="padding: 8px; border-radius: 8px; border: 1px solid #ddd;">
                        <option value="">All Status</option>
                        <option value="pending" ${currentStatusFilter === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="progress" ${currentStatusFilter === 'progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${currentStatusFilter === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="btn-primary" id="addTaskBtn">
                        <i class="fa-solid fa-plus"></i> Add Task
                    </button>
                </div>
            </div>
            <div class="tasks-table-wrapper">
                <table class="tasks-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Project</th>
                            <th>Team</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th style="width:80px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.tasks.map(task => {
        const isOwner = task.owner?._id === currentUser?._id;
        const isAssigned = task.assignedTo?._id === currentUser?._id;
        const projectId = task?.project?._id || task?.project;

        const project = projectId
            ? appData.projects.find(p => String(p._id) === String(projectId))
            : null;

        const teamId =
            project?.team?._id ??
            project?.team ??
            null;

        const team = teamId
            ? appData.teams.find(t => String(t._id) === String(teamId))
            : null;

        return `
                                <tr data-task-id="${task._id}">
                                    <td>${escapeHtml(task.title)}</td>
                                    <td>${escapeHtml(task.project?.name || 'Unknown Project')}</td>
                                    <td>${team ? escapeHtml(team.name) : 'Personal'}</td>
                                    <td>${task.dueDate || '—'}</td>
                                    <td>
                                        ${isOwner || isAssigned ? `
                                            <select class="task-status-select" data-id="${task._id}">
                                                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>In Progress</option>
                                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                                            </select>
                                        ` : `
                                            <span class="status-badge ${task.status === 'completed' ? 'completed' : (task.status === 'progress' ? 'progress' : 'pending')}">${task.status}</span>
                                        `}
                                    </td>
                                    <td>${task.assignedTo?.username || task.assignedTo?.name || 'Unassigned'}</td>
                                    <td class="action-icons">
                                        ${isOwner ? `
                                            <i class="fa-regular fa-pen-to-square edit-task" data-id="${task._id}" style="cursor:pointer; color:#4a6fa5;"></i>
                                            <i class="fa-regular fa-trash-can delete-task" data-id="${task._id}" style="cursor:pointer; color:#a0517a;"></i>
                                        ` : isAssigned ? `
                                            <span style="font-size: 12px; color: #888;">Status only</span>
                                        ` : `
                                            <span style="font-size: 12px; color: #888;">View only</span>
                                        `}
                                    </td>
                                </tr>
                            `;
    }).join('')}
                        ${appData.tasks.length === 0 ? '<tr><td colspan="7" style="text-align:center">No tasks. Create one!</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderTeams() {
    const currentUser = AuthService.getCurrentUser();

    return `
        <div class="section-card">
            <div class="section-header">
                <h2><i class="fa-solid fa-users"></i> Teams</h2>
                <button class="btn-primary" id="addTeamBtn">
                    <i class="fa-solid fa-plus"></i> New Team
                </button>
            </div>
            <div class="teams-grid">
                ${appData.teams.map(team => {
        const isOwner = team.owner?._id === currentUser?._id || team.owner === currentUser?._id;

        let membersList = [];
        if (Array.isArray(team.members)) {
            membersList = team.members.map(m => {
                if (m && typeof m === 'object') {
                    if (m.username) return m.username;
                    if (m.fullName) return m.fullName;
                    if (m.name) return m.name;
                    if (m.email) return m.email;
                    if (m._id && typeof m._id === 'object') {
                        return m._id.username || m._id.fullName || m._id.name || 'Unknown';
                    }
                    if (m._id && typeof m._id === 'string') {
                        return `User ${m._id.slice(-6)}`;
                    }
                    return 'Unknown';
                }
                if (typeof m === 'string') {
                    return `User ${m.slice(-6)}`;
                }
                return 'Unknown';
            });
        }
        const membersCount = membersList.length;

        return `
                        <div class="team-card">
                            <div class="team-name">
                                ${escapeHtml(team.name)}
                            </div>

                            <div class="team-role">
                                <i class="fa-solid fa-briefcase"></i>
                                ${escapeHtml(team.role || 'Team Member')}
                            </div>

                            <div>
                                <i class="fa-regular fa-user"></i>
                                Owner: ${team.owner?.username || team.owner?.fullName || 'Unknown'}
                            </div>
                            
                            <div>
                                <i class="fa-solid fa-users"></i>
                                Members (${membersCount}):
                                ${membersList.length > 0 ? membersList.join(', ') : 'No members'}
                            </div>

                            <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;">
                                ${isOwner ? `
                                    <i class="fa-regular fa-pen-to-square edit-team" 
                                       data-id="${team._id}" 
                                       style="cursor:pointer; color:#4a6fa5;"></i>
                                    <i class="fa-regular fa-trash-can delete-team" 
                                       data-id="${team._id}" 
                                       style="cursor:pointer; color:#a0517a;"></i>
                                ` : `
                                    <span style="font-size: 12px; color: #888;">Member only</span>
                                `}
                            </div>
                        </div>
                    `;
    }).join('')}
                ${appData.teams.length === 0
            ? '<div class="empty-message">No teams yet. Create a team to collaborate.</div>'
            : ''
        }
            </div>
        </div>
    `;
}

// Modal handling
let modalCallback = null;

function showModal(title, fieldsHtml, onConfirm) {
    const modal = document.getElementById('genericModal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    const titleEl = document.getElementById('modalTitle');
    const fieldsEl = document.getElementById('modalDynamicFields');

    if (titleEl) titleEl.innerText = title;
    if (fieldsEl) fieldsEl.innerHTML = fieldsHtml;

    modal.classList.add('active');
    modalCallback = onConfirm;
}

function closeModal() {
    const modal = document.getElementById('genericModal');
    if (modal) {
        modal.classList.remove('active');
    }
    modalCallback = null;
}

// Load data from backend
async function loadData() {
    try {
        const [projects, tasks, teams] = await Promise.all([
            DashboardAPI.getProjects(),
            DashboardAPI.getTasks(),
            DashboardAPI.getTeams()
        ]);

        appData.projects = projects;
        appData._allTasks = tasks;
        originalTasks = tasks;
        appData.tasks = tasks;
        appData.teams = teams;

        renderCurrentTab();

        // Refresh notifications after data load
        if (notificationSystem) {
            await notificationSystem.loadNotifications();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="section-card">
                    <div style="text-align: center; padding: 40px; color: red;">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 48px;"></i>
                        <h3>Error loading data</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" class="btn-primary">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

function renderCurrentTab() {
    let html = '';
    if (currentTab === 'dashboard') html = renderDashboard();
    else if (currentTab === 'projects') html = renderProjects();
    else if (currentTab === 'tasks') html = renderTasks();
    else if (currentTab === 'teams') html = renderTeams();

    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = html;
        attachEventListeners();
    }
}

async function attachEventListeners() {
    // Delete project
    document.querySelectorAll('.delete-project').forEach(el => {
        el.addEventListener('click', async (e) => {
            const id = el.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this project?')) {
                try {
                    await DashboardAPI.deleteProject(id);
                    await loadData();
                } catch (error) {
                    alert('Error deleting project: ' + error.message);
                }
            }
        });
    });

    // Delete task
    document.querySelectorAll('.delete-task').forEach(el => {
        el.addEventListener('click', async (e) => {
            const id = el.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this task?')) {
                try {
                    await DashboardAPI.deleteTask(id);
                    await loadData();
                } catch (error) {
                    alert('Error deleting task: ' + error.message);
                }
            }
        });
    });

    // Delete team
    document.querySelectorAll('.delete-team').forEach(el => {
        el.addEventListener('click', async (e) => {
            const id = el.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this team?')) {
                try {
                    await DashboardAPI.deleteTeam(id);
                    await loadData();
                } catch (error) {
                    alert('Error deleting team: ' + error.message);
                }
            }
        });
    });

    // Edit Project
    document.querySelectorAll('.edit-project').forEach(el => {
        el.addEventListener('click', (e) => {
            const id = el.getAttribute('data-id');
            const project = appData.projects.find(p => p._id === id);
            if (!project) return;

            showModal('Edit Project', `
            <input type="text" id="editProjName" value="${escapeHtml(project.name)}" required>
            <textarea id="editProjDesc">${escapeHtml(project.description || '')}</textarea>
            <select id="editProjStatus">
                <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="planning" ${project.status === 'planning' ? 'selected' : ''}>Planning</option>
            </select>
        `, async () => {
                const name = document.getElementById('editProjName').value;
                if (name) {
                    try {
                        await DashboardAPI.updateProject(id, {
                            name: name,
                            description: document.getElementById('editProjDesc').value,
                            status: document.getElementById('editProjStatus').value
                        });
                        await loadData();
                        closeModal();
                    } catch (error) {
                        alert('Error updating project: ' + error.message);
                    }
                }
            });
        });
    });

    // Edit task button
    document.querySelectorAll('.edit-task').forEach(el => {
        el.addEventListener('click', (e) => {
            const id = el.getAttribute('data-id');
            const task = appData.tasks.find(t => t._id === id);
            if (!task) return;

            const currentUser = AuthService.getCurrentUser();
            const project = appData.projects.find(p => p._id === task.project?._id);
            // const team = project?.team ? appData.teams.find(t => t._id === project.team) : null;
            const team = project?.team || null;

            console.log("Project:", project);
            console.log("Team:", team);
            console.log("Members:", team?.members);

            const userMap = new Map();

            userMap.set(currentUser._id, {
                _id: currentUser._id,
                username: currentUser.username || currentUser.fullName || 'Me',
                fullName: currentUser.fullName || currentUser.username || 'Me'
            });

            if (team) {
                if (team.owner) {
                    const ownerId = team.owner._id || team.owner;
                    const ownerName = team.owner.username || team.owner.fullName || team.owner.name || 'Owner';
                    userMap.set(ownerId.toString(), {
                        _id: ownerId,
                        username: ownerName,
                        fullName: ownerName
                    });
                }

                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(m => {
                        let memberId, memberName;

                        if (typeof m === 'object' && m !== null) {
                            if (m._id) {
                                memberId = m._id;
                                memberName = m.username || m.fullName || m.name || m.email || 'Unknown';
                            } else {
                                memberId = m.id || m._id;
                                memberName = m.username || m.fullName || m.name || m.email || 'Unknown';
                            }
                        } else if (typeof m === 'string') {
                            memberId = m;

                            // Try to find the user in the loaded tasks
                            const user = appData.tasks.find(t =>
                                t.assignedTo &&
                                String(t.assignedTo._id) === String(memberId)
                            )?.assignedTo;

                            memberName = user
                                ? (user.username || user.fullName || user.name)
                                : `User ${m.slice(-6)}`;
                        } else {
                            return;
                        }

                        if (memberId) {
                            userMap.set(memberId.toString(), {
                                _id: memberId,
                                username: memberName,
                                fullName: memberName
                            });
                        }
                    });
                }
            } else {
                if (task.assignedTo && task.assignedTo._id && task.assignedTo._id !== currentUser._id) {
                    const assignedName = task.assignedTo.username || task.assignedTo.fullName || 'Assigned User';
                    userMap.set(task.assignedTo._id.toString(), {
                        _id: task.assignedTo._id,
                        username: assignedName,
                        fullName: assignedName
                    });
                }
            }

            const availableUsers = Array.from(userMap.values());
            const currentAssignee = task.assignedTo?._id || '';

            showModal('Edit Task', `
            <input id="editTaskTitle" value="${escapeHtml(task.title)}" required>
            <textarea id="editTaskDesc">${escapeHtml(task.description || '')}</textarea>
            <input type="date" id="editTaskDue" value="${task.dueDate || ''}">
            
            <select id="editTaskStatus">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
            
            <div style="margin-top: 12px;">
                <label>Assign To:</label>
                <select id="editAssignedTo" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #ddd; margin-top: 4px;">
                    <option value="">Unassigned</option>
                    <option value="me" ${currentAssignee === currentUser._id ? 'selected' : ''}>Assign to me</option>
                    ${availableUsers
                    .filter(user => user._id.toString() !== currentUser._id.toString())
                    .map(user => {
                        const userId = user._id.toString();
                        const displayName = user.username || user.fullName || 'Unknown';
                        return `
                                <option value="${userId}" ${userId === currentAssignee ? 'selected' : ''}>
                                    ${escapeHtml(displayName)}
                                </option>
                            `;
                    }).join('')
                }
                </select>
                <!--${team ? `<p style="font-size: 12px; color: #666; margin-top: 4px;">Team: ${escapeHtml(team.name)}</p>` : ''}
                <p style="font-size: 11px; color: #999; margin-top: 4px;">${availableUsers.length} users available</p>-->
            </div>
        `, async () => {
                const title = document.getElementById('editTaskTitle').value;
                if (!title) {
                    alert('Please fill in all required fields');
                    return;
                }

                let assignedTo = document.getElementById('editAssignedTo').value;
                if (assignedTo === "me") {
                    assignedTo = currentUser._id;
                }

                try {
                    await DashboardAPI.updateTask(id, {
                        title: title,
                        description: document.getElementById('editTaskDesc').value,
                        dueDate: document.getElementById('editTaskDue').value,
                        status: document.getElementById('editTaskStatus').value,
                        assignedTo: assignedTo || null
                    });

                    await loadData();
                    closeModal();
                } catch (error) {
                    alert('Error updating task: ' + error.message);
                }
            });
        });
    });

    // Task filters
    const projectFilter = document.getElementById('taskFilterProject');
    const statusFilter = document.getElementById('taskFilterStatus');

    function applyFilters() {
        const project = document.getElementById('taskFilterProject')?.value || '';
        const status = document.getElementById('taskFilterStatus')?.value || '';

        let filtered = [...originalTasks];

        if (project) {
            filtered = filtered.filter(task => {
                const taskProjectId = task.project?._id || task.project;
                return taskProjectId === project;
            });
        }

        if (status) {
            filtered = filtered.filter(task => task.status === status);
        }

        appData.tasks = filtered;
        renderCurrentTab();
    }

    if (projectFilter) {
        projectFilter.removeEventListener('change', applyFilters);
        projectFilter.addEventListener('change', applyFilters);
    }

    if (statusFilter) {
        statusFilter.removeEventListener('change', applyFilters);
        statusFilter.addEventListener('change', applyFilters);
    }

    // UPDATE TASK STATUS
    document.querySelectorAll('.task-status-select').forEach(el => {
        el.addEventListener('change', async function (e) {
            const taskId = this.getAttribute('data-id');
            const newStatus = this.value;
            const oldStatus = this.getAttribute('data-old-status') || 'pending';

            this.setAttribute('data-old-status', oldStatus);

            // console.log('Status change:', { taskId, newStatus, oldStatus });

            try {
                this.style.opacity = '0.6';
                this.disabled = true;

                const result = await DashboardAPI.updateTaskStatus(taskId, newStatus);
                console.log('✅ Status updated successfully:', result);

                this.setAttribute('data-old-status', newStatus);

                await loadData();

            } catch (error) {
                console.error('❌ Error updating task status:', error);
                this.value = oldStatus;
                alert('Error updating task status: ' + (error.response?.data?.message || error.message));

            } finally {
                this.style.opacity = '1';
                this.disabled = false;
            }
        });
    });

    // Edit Team
    document.querySelectorAll('.edit-team').forEach(el => {
        el.addEventListener('click', (e) => {
            const id = el.getAttribute('data-id');
            const team = appData.teams.find(t => t._id === id);
            if (!team) return;

            let tempMembers = [...(team.members || [])];

            showModal('Edit Team', `
            <input id="editTeamName" value="${escapeHtml(team.name)}" required>
            <input id="editTeamRole" value="${escapeHtml(team.role || '')}" placeholder="Team Role">
            
            <div style="margin-top: 12px;">
                <h4>Current Members</h4>
                <div id="currentMembersList">
                    ${team.members?.map(m => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span>${m?.username || m?.name || 'Unknown'}</span>
                            <button class="remove-member-btn" data-id="${m._id}" style="color: red; background: none; border: none; cursor: pointer;">✕</button>
                        </div>
                    `).join('') || 'No members'}
                </div>
            </div>

            <div style="margin-top: 12px;">
                <h4>Add Members</h4>
                <input id="addMemberInput" placeholder="User ID">
                <button type="button" id="addMemberToTeamBtn">Add</button>
            </div>

            <div id="newMembersList"></div>
        `, async () => {
                const name = document.getElementById('editTeamName').value;
                if (!name) return;

                try {
                    await DashboardAPI.updateTeam(id, {
                        name: name,
                        role: document.getElementById('editTeamRole').value,
                        members: tempMembers.map(m => m._id || m)
                    });

                    await loadData();
                    closeModal();
                } catch (error) {
                    alert('Error updating team: ' + error.message);
                }
            });

            setTimeout(() => {
                const addBtn = document.getElementById('addMemberToTeamBtn');
                const input = document.getElementById('addMemberInput');

                if (addBtn) {
                    addBtn.addEventListener('click', () => {
                        const memberId = input.value.trim();
                        if (!memberId) return;

                        if (!tempMembers.some(m => (m._id || m) === memberId)) {
                            tempMembers.push({ _id: memberId });
                            const list = document.getElementById('newMembersList');
                            const div = document.createElement('div');
                            div.style.display = 'flex';
                            div.style.justifyContent = 'space-between';
                            div.style.padding = '4px 0';
                            div.innerHTML = `
                            <span>${memberId} (pending)</span>
                            <button class="remove-new-member" data-id="${memberId}" style="color: red; background: none; border: none; cursor: pointer;">✕</button>
                        `;
                            list.appendChild(div);
                            input.value = '';
                        }
                    });
                }

                document.querySelectorAll('.remove-member-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        tempMembers = tempMembers.filter(m => (m._id || m) !== id);
                        btn.parentElement.remove();
                    });
                });

                document.querySelectorAll('.remove-new-member').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        tempMembers = tempMembers.filter(m => (m._id || m) !== id);
                        btn.parentElement.remove();
                    });
                });
            }, 0);
        });
    });

    // Add project button
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            showModal('Create Project', `
                <input type="text" id="projName" placeholder="Project Name" required>
                <textarea id="projDesc" placeholder="Description"></textarea>
                <select id="projStatus">
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                </select>
                <select id="projTeam">
                    <option value="">Personal Project</option>
                    ${appData.teams.map(t => `
                        <option value="${t._id}">${t.name}</option>
                    `).join('')}
                </select>
            `, async () => {
                const name = document.getElementById('projName').value;
                if (name) {
                    try {
                        await DashboardAPI.createProject({
                            name: name,
                            description: document.getElementById('projDesc').value,
                            status: document.getElementById('projStatus').value,
                            teamId: document.getElementById('projTeam').value || null
                        });
                        await loadData();
                        closeModal();
                    } catch (error) {
                        alert('Error creating project: ' + error.message);
                    }
                }
            });
        });
    }

    // Add task button
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const currentUser = AuthService.getCurrentUser();

            showModal('New Task', `
            <input id="taskTitle" placeholder="Task title" required>
            <textarea id="taskDesc" placeholder="Description"></textarea>

            <select id="taskProject">
                <option value="">Select Project</option>
                ${appData.projects.map(p =>
                `<option value="${p._id}">${p.name} ${p.team ? '(Team)' : '(Personal)'}</option>`
            ).join('')}
            </select>

            <select id="taskTeamDisplay" disabled>
                <option value="">Team will show here</option>
            </select>

            <input type="date" id="taskDue">

            <select id="taskStatus">
                <option value="pending">Pending</option>
                <option value="progress">In Progress</option>
                <option value="completed">Completed</option>
            </select>

            <select id="assignedTo">
                <option value="">Unassigned</option>
                <option value="me">Assign to me</option>
            </select>
        `, async () => {
                const title = document.getElementById('taskTitle').value;
                const projectId = document.getElementById('taskProject').value;

                if (!title || !projectId) {
                    alert('Please fill in all required fields');
                    return;
                }

                let assignedTo = document.getElementById('assignedTo').value;
                if (assignedTo === "me") {
                    assignedTo = currentUser._id;
                }

                try {
                    await DashboardAPI.createTask({
                        title,
                        description: document.getElementById('taskDesc').value,
                        project: projectId,
                        dueDate: document.getElementById('taskDue').value,
                        status: document.getElementById('taskStatus').value,
                        assignedTo: assignedTo || null
                    });

                    await loadData();
                    closeModal();
                } catch (error) {
                    alert('Error creating task: ' + error.message);
                }
            });

            setTimeout(() => {
                const projectSelect = document.getElementById('taskProject');
                const assignedSelect = document.getElementById('assignedTo');
                const teamDisplay = document.getElementById('taskTeamDisplay');

                if (projectSelect) {
                    projectSelect.addEventListener('change', () => {
                        const project = appData.projects.find(p =>
                            p._id === projectSelect.value
                        );

                        if (project && project.team) {
                            const teamId = project.team?._id || project.team;
                            const team = appData.teams.find(t =>
                                String(t._id) === String(teamId)
                            );
                            if (team) {
                                teamDisplay.value = `Team: ${team.name}`;
                                if (team.members && team.members.length > 0) {
                                    const memberOptions = team.members.map(m =>
                                        `<option value="${m._id || m}">${m.username || m.name || 'Unknown'}</option>`
                                    ).join('');
                                    assignedSelect.innerHTML = `
                                    <option value="">Unassigned</option>
                                    <option value="me">Assign to me</option>
                                    ${memberOptions}
                                `;
                                }
                            }
                        } else {
                            teamDisplay.value = 'Personal Project';
                            assignedSelect.innerHTML = `
                            <option value="">Unassigned</option>
                            <option value="me">Assign to me</option>
                        `;
                        }
                    });

                    projectSelect.dispatchEvent(new Event('change'));
                }
            }, 0);
        });
    }

    // Add team button
    const addTeamBtn = document.getElementById('addTeamBtn');

    if (addTeamBtn) {
        addTeamBtn.addEventListener('click', () => {
            const members = [];

            showModal('Create Team', `
            <input id="teamName" placeholder="Team Name" required>
            <input id="teamRole" placeholder="Your Role (User)">

            <div>
                <input id="memberInput" placeholder="User ID">
                <button type="button" id="addMemberBtn">Add Member</button>
            </div>

            <ul id="membersList"></ul>
        `, async () => {
                const name = document.getElementById('teamName').value;

                if (!name) return;

                try {
                    await DashboardAPI.createTeam({
                        name,
                        role: document.getElementById('teamRole').value,
                        members: members.length ? members : null
                    });

                    await loadData();
                    closeModal();
                } catch (error) {
                    alert('Error creating team: ' + error.message);
                }
            });

            setTimeout(() => {
                const addBtn = document.getElementById('addMemberBtn');
                const input = document.getElementById('memberInput');
                const list = document.getElementById('membersList');

                if (!addBtn) return;

                addBtn.addEventListener('click', () => {
                    const id = input.value.trim();
                    if (!id) return;

                    members.push(id);

                    const li = document.createElement('li');
                    li.textContent = `User ID: ${id}`;
                    list.appendChild(li);

                    input.value = '';
                });
            }, 0);
        });
    }
}

function initSidebar() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            currentTab = item.getAttribute('data-tab');
            renderCurrentTab();
        });
    });
}

async function initDashboard() {
    console.log('Initializing dashboard...');

    const token = AuthService.getToken();
    if (!token) {
        console.log('No token found, redirecting to login...');
        window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
        return;
    }

    try {
        const isValid = await AuthService.checkAuth();
        if (!isValid) {
            console.log('Invalid token, redirecting to login...');
            window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
            return;
        }

        const user = AuthService.getCurrentUser();
        if (user) {
            updateProfileDropdown(user);
        }

        initSidebar();
        await loadData();

        const modalCancelBtn = document.getElementById('modalCancelBtn');
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', closeModal);
        }

        const modalConfirmBtn = document.getElementById('modalConfirmBtn');
        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => {
                if (modalCallback) modalCallback();
            });
        }

        setupProfileDropdown();
        setupLogout();

        // Initialize notification system - ONLY ONCE
        if (!notificationSystem) {
            notificationSystem = new NotificationSystem();
            await notificationSystem.init();
        }

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        AuthService.logout();
        window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
    }
}

// Update profile dropdown with user info
function updateProfileDropdown(user) {
    if (!user) return;

    const username = user.username || user.fullName || 'User';
    const initial = username.charAt(0).toUpperCase();
    const userId = user._id || user.id || 'No ID';

    const profileInitial = document.getElementById('profileInitial');
    if (profileInitial) profileInitial.textContent = initial;

    const dropdownInitial = document.getElementById('dropdownInitial');
    if (dropdownInitial) dropdownInitial.textContent = initial;

    const dropdownUsername = document.getElementById('dropdownUsername');
    if (dropdownUsername) dropdownUsername.textContent = username;

    const userIdDisplay = document.getElementById('userIdDisplay');
    if (userIdDisplay) userIdDisplay.textContent = userId;
}

// Setup profile dropdown events
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const copyIdBtn = document.getElementById('copyIdBtn');
    const userIdDisplay = document.getElementById('userIdDisplay');

    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        if (profileDropdown) {
            profileDropdown.classList.remove('show');
        }
    });

    if (copyIdBtn && userIdDisplay) {
        copyIdBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = userIdDisplay.textContent;

            try {
                await navigator.clipboard.writeText(userId);
                showToast('✅ User ID copied to clipboard!');
                copyIdBtn.classList.add('copied');
                setTimeout(() => {
                    copyIdBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                const textarea = document.createElement('textarea');
                textarea.value = userId;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast('✅ User ID copied to clipboard!');
            }
        });
    }
}

// Setup logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            AuthService.logout();
            window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
        });
    }
}

// Start the dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}