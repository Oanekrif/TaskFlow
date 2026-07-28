// routes/tasks
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Team = require('../models/Team');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get tasks with filters
router.get('/', protect, async (req, res) => {
    try {
        const { project, assignedTo, status } = req.query;

        let query = {
            $or: [
                { owner: req.user._id },
                { assignedTo: req.user._id }
            ]
        };

        // Apply filters
        if (project) query.project = project;
        if (assignedTo) query.assignedTo = assignedTo;
        if (status) query.status = status;

        const tasks = await Task.find(query)
            .populate('project')
            .populate('assignedTo')
            .populate('owner')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create task
router.post('/', protect, async (req, res) => {
    try {
        const {
            title,
            description,
            project,
            dueDate,
            status,
            assignedTo
        } = req.body;

        const existingProject = await Project.findOne({
            _id: project
        });

        if (!existingProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check permissions
        let canCreate = false;

        if (!existingProject.team) {
            canCreate = existingProject.owner.toString() === req.user._id.toString();
        } else {
            const team = await Team.findById(existingProject.team);
            if (team) {
                const isTeamOwner = team.owner.toString() === req.user._id.toString();
                const isTeamMember = team.members.some(
                    m => m.toString() === req.user._id.toString()
                );
                canCreate = isTeamOwner || isTeamMember;
            }
        }

        if (!canCreate) {
            return res.status(403).json({
                success: false,
                message: 'You don\'t have permission to create tasks in this project'
            });
        }

        const task = await Task.create({
            title,
            description: description || '',
            project,
            dueDate,
            status: status || 'pending',
            owner: req.user._id,
            assignedTo: assignedTo || null,
            lastModifiedBy: req.user._id
        });

        await task.populate('project', 'name team');
        await task.populate('assignedTo', 'username name email fullName');
        await task.populate('owner', 'username name email fullName');

        // Create notification if task is assigned to someone
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
            await Notification.create({
                userId: assignedTo,
                type: 'assignment',
                title: '📋 New Task Assigned',
                message: `You have been assigned to "${title}" in ${existingProject.name}`,
                taskId: task._id,
                projectId: project,
                changedBy: req.user._id,
                read: false
            });
        }

        res.status(201).json({
            success: true,
            task
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

router.put('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('project', 'name team owner')
            .populate('assignedTo', 'username name email fullName')
            .populate('owner', 'username name email fullName');

        if (!task) {
            console.log('Task not found');
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const isOwner = task.owner._id.toString() === req.user._id.toString();
        const isAssigned = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();
        const userId = req.user._id;
        const userFullName = req.user.fullName || req.user.username || 'Someone';

        // Check permissions
        if (!isOwner && !isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'You don\'t have permission to update this task'
            });
        }

        // Track changes
        const changes = [];
        const updates = {};

        // Helper to track changes
        const trackChange = (field, oldValue, newValue) => {
            if (oldValue !== undefined && newValue !== undefined && String(oldValue) !== String(newValue)) {
                console.log(`📝 Change detected: ${field} = "${oldValue}" -> "${newValue}"`);
                changes.push({
                    field: field,
                    oldValue: oldValue,
                    newValue: newValue,
                    changedBy: userId,
                    changedAt: new Date()
                });
                return true;
            }
            return false;
        };

        // Check each field
        if (req.body.title !== undefined) {
            if (trackChange('title', task.title, req.body.title)) {
                updates.title = req.body.title;
            }
        }

        if (req.body.description !== undefined) {
            if (trackChange('description', task.description, req.body.description)) {
                updates.description = req.body.description;
            }
        }

        if (req.body.dueDate !== undefined) {
            if (trackChange('dueDate', task.dueDate, req.body.dueDate)) {
                updates.dueDate = req.body.dueDate;
            }
        }

        if (req.body.status !== undefined) {
            if (trackChange('status', task.status, req.body.status)) {
                updates.status = req.body.status;
            }
        }

        // Only owner can change assignment
        if (isOwner && req.body.assignedTo !== undefined) {
            const oldAssigned = task.assignedTo ? task.assignedTo._id.toString() : null;
            const newAssigned = req.body.assignedTo || null;
            if (trackChange('assignedTo', oldAssigned, newAssigned)) {
                updates.assignedTo = req.body.assignedTo || null;
            }
        }

        console.log('📊 Changes detected:', changes.length);
        console.log('📊 Updates to apply:', Object.keys(updates));

        // If no updates, return current task
        if (Object.keys(updates).length === 0) {
            console.log('ℹ️ No updates to apply');
            return res.json({
                success: true,
                task: task
            });
        }

        // change history to task
        if (changes.length > 0) {
            task.changeHistory = [...(task.changeHistory || []), ...changes];
            task.lastModifiedBy = userId;
        }

        // Apply updates
        Object.keys(updates).forEach(key => {
            task[key] = updates[key];
        });

        await task.save();
        console.log('✅ Task saved successfully');

        // Create notif if there were changes
        if (changes.length > 0) {
            console.log('🔔 Creating notifications for changes...');

            // Get the project info
            const project = await Project.findById(task.project._id);

            // Create change summary for notification
            const changeSummary = changes.map(c => {
                const fieldNames = {
                    'title': 'title',
                    'description': 'description',
                    'status': 'status',
                    'dueDate': 'due date',
                    'assignedTo': 'assignment'
                };
                return fieldNames[c.field] || c.field;
            }).join(', ');

            console.log('📝 Change summary:', changeSummary);

            // Determine who to notify
            const notifyUsers = new Set();
            const userWhoChanged = userId.toString();

            if (task.assignedTo && task.assignedTo._id.toString() !== userWhoChanged) {
                notifyUsers.add(task.assignedTo._id.toString());
            }

            if (project && project.owner) {
                const projectOwnerId = project.owner.toString();
                if (projectOwnerId !== userWhoChanged) {
                    notifyUsers.add(projectOwnerId);
                }
            }

            if (task.owner && task.owner._id.toString() !== userWhoChanged) {
                notifyUsers.add(task.owner._id.toString());
            }

            // Check if this was an assignment change
            const assignmentChange = changes.find(c => c.field === 'assignedTo');

            // Create notifications for each user
            let notificationCount = 0;
            for (const userIdToNotify of notifyUsers) {
                let notificationType = 'task_update';
                let notificationTitle = `📝 Task Updated: ${task.title}`;
                let notificationMessage = `${userFullName} changed: ${changeSummary}`;

                // Special case for assignment
                if (assignmentChange) {
                    const oldAssigned = assignmentChange.oldValue;
                    const newAssigned = assignmentChange.newValue;

                    if (newAssigned === userIdToNotify) {
                        notificationType = 'assignment';
                        notificationTitle = '📋 New Task Assigned';
                        notificationMessage = `${userFullName} assigned you to "${task.title}"`;
                    } else if (oldAssigned === userIdToNotify) {
                        notificationType = 'unassigned';
                        notificationTitle = '🚫 Task Unassigned';
                        notificationMessage = `${userFullName} unassigned you from "${task.title}"`;
                    }
                }

                // Check if this was a status change and notify the owner/assignee
                const statusChange = changes.find(c => c.field === 'status');
                if (statusChange && isAssigned) {
                    // If the assigned user changed status, notify the owner
                    if (userIdToNotify === task.owner._id.toString()) {
                        notificationTitle = '🔄 Status Changed by Assignee';
                        notificationMessage = `${userFullName} changed status to "${task.status}" for "${task.title}"`;
                    }
                }

                // Skip if the notification is for the person who made the change
                if (userIdToNotify !== userWhoChanged) {
                    console.log(`📨 Creating notification for user ${userIdToNotify}:`, notificationTitle);

                    try {
                        const newNotification = await Notification.create({
                            userId: userIdToNotify,
                            type: notificationType,
                            title: notificationTitle,
                            message: notificationMessage,
                            taskId: task._id,
                            projectId: task.project._id,
                            changedBy: userId,
                            read: false
                        });
                        notificationCount++;
                    } catch (notifError) {
                        console.error('❌ Error creating notification:', notifError);
                    }
                }
            }

        } else {
            console.log('ℹNo changes detected, skipping notifications');
        }

        // Get updated task with populated fields
        const updatedTask = await Task.findById(req.params.id)
            .populate('project', 'name team')
            .populate('assignedTo', 'username name email fullName')
            .populate('owner', 'username name email fullName');

        res.json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error('❌ Error updating task:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Delete task
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found or you don\'t have permission'
            });
        }

        // Delete associated notifications
        await Notification.deleteMany({ taskId: req.params.id });

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;