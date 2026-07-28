// routes/project
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get projects
router.get('/', protect, async (req, res) => {
    try {
        const teams = await Team.find({
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        });

        const userTeamIds = teams.map(t => t._id);

        const projects = await Project.find({
            $or: [
                { owner: req.user._id },
                { team: { $in: userTeamIds } }
            ]
        })
            .populate('team')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            projects
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create project (only team owner or user can create personal project)
router.post('/', protect, async (req, res) => {
    try {
        const { name, description, status, teamId } = req.body;

        let team = null;

        if (teamId) {
            team = await Team.findById(teamId);

            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: "Team not found"
                });
            }

            const isTeamOwner = team.owner.toString() === req.user._id.toString();
            const isTeamMember = team.members.some(
                memberId => memberId.toString() === req.user._id.toString()
            );

            // Team owner or any team member can create projects for this team
            if (!isTeamOwner && !isTeamMember) {
                return res.status(403).json({
                    success: false,
                    message: "Only team owner or members can create projects for this team"
                });
            }
        }

        const project = await Project.create({
            name,
            description,
            status: status || 'active',
            team: teamId || null,
            owner: req.user._id
        });

        // Notify all other team members that a new project was created
        if (team) {
            const creatorName = req.user.fullName || req.user.username || 'Someone';
            const recipients = new Set(team.members.map(m => m.toString()));
            recipients.add(team.owner.toString());
            recipients.delete(req.user._id.toString()); // don't notify the creator

            await Promise.all(Array.from(recipients).map(userId =>
                Notification.create({
                    userId,
                    type: 'project_created',
                    title: '📁 New Team Project',
                    message: `${creatorName} created the project "${project.name}" in your team`,
                    projectId: project._id,
                    changedBy: req.user._id,
                    read: false
                })
            ));
        }

        res.status(201).json({
            success: true,
            project
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// Update project (only owner can update)
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, description, status } = req.body;

        const project = await Project.findById(req.params.id).populate('team');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const isProjectOwner = project.owner.toString() === req.user._id.toString();
        const isTeamOwner = project.team && project.team.owner.toString() === req.user._id.toString();
        // const isTeamMember = project.team && project.team.members.some(
        //     memberId => memberId.toString() === req.user._id.toString()
        // );

        if (!isProjectOwner && !isTeamOwner) { // I prefere to rmove && !isTeamMember
            return res.status(403).json({
                success: false,
                message: "You don't have permission to update this project"
            });
        }

        // Update fields
        if (name) project.name = name;
        if (description !== undefined) project.description = description;
        if (status) project.status = status;

        await project.save();

        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Delete project (only owner can delete)
router.delete('/:id', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('team');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const isProjectOwner = project.owner.toString() === req.user._id.toString();
        const isTeamOwner = project.team && project.team.owner.toString() === req.user._id.toString();
        // const isTeamMember = project.team && project.team.members.some(
        //     memberId => memberId.toString() === req.user._id.toString()
        // );

        if (!isProjectOwner && !isTeamOwner) { //  && !isTeamMember
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this project"
            });
        }
        
        await project.deleteOne();

        // Delete all tasks under this project
        await Task.deleteMany({ project: req.params.id });

        // Delete notifications tied to those tasks/this project
        await Notification.deleteMany({ projectId: req.params.id });

        res.json({
            success: true,
            message: 'Project deleted successfully'
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