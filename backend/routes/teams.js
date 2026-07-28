// routes/teams.js
const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

// GET all teams
router.get('/', protect, async (req, res) => {
    try {
        const teams = await Team.find({
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        })
            .populate('members', 'username name email fullName')
            .populate('owner', 'username name email fullName')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            teams
        });
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// GET single team
router.get('/:id', protect, async (req, res) => {
    try {
        const team = await Team.findOne({
            _id: req.params.id,
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        })
            .populate('members', 'username name email fullName')
            .populate('owner', 'username name email fullName');

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        res.json({
            success: true,
            team
        });
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// CREATE team
router.post('/', protect, async (req, res) => {
    try {
        const { name, role, members } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Team name is required'
            });
        }

        let memberIds = [];
        if (members) {
            if (typeof members === 'string') {
                memberIds = members.split(',').map(id => id.trim()).filter(id => id);
            } else if (Array.isArray(members)) {
                memberIds = members;
            }
        }

        memberIds = memberIds.filter(id => id.toString() !== req.user._id.toString());

        const team = await Team.create({
            name,
            role: role || 'Team Member',
            members: memberIds,
            owner: req.user._id
        });

        await team.populate('members', 'username email name fullName');
        await team.populate('owner', 'username email name fullName');

        // Notify every member that they were added to a new team
        const creatorName = req.user.fullName || req.user.username || 'Someone';
        await Promise.all(memberIds.map(memberId =>
            Notification.create({
                userId: memberId,
                type: 'team_invite',
                title: '👥 Added to Team',
                message: `${creatorName} added you to the team "${team.name}"`,
                changedBy: req.user._id,
                read: false
            })
        ));

        res.status(201).json({
            success: true,
            team
        });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// UPDATE team
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, role, members, addMembers, removeMembers } = req.body;

        const team = await Team.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you don\'t have permission'
            });
        }

        if (name) team.name = name;
        if (role) team.role = role;

        if (members) {
            let memberIds = [];
            if (typeof members === 'string') {
                memberIds = members.split(',').map(id => id.trim()).filter(id => id);
            } else if (Array.isArray(members)) {
                memberIds = members;
            }
            memberIds = memberIds.filter(id => id.toString() !== req.user._id.toString());
            team.members = memberIds;
        }

        if (addMembers) {
            const newMembers = Array.isArray(addMembers) ? addMembers : [addMembers];
            const actuallyNew = [];
            newMembers.forEach(memberId => {
                if (!team.members.some(m => m.toString() === memberId.toString())) {
                    team.members.push(memberId);
                    actuallyNew.push(memberId);
                }
            });

            if (actuallyNew.length > 0) {
                const actorName = req.user.fullName || req.user.username || 'Someone';
                await Promise.all(actuallyNew.map(memberId =>
                    Notification.create({
                        userId: memberId,
                        type: 'team_invite',
                        title: '👥 Added to Team',
                        message: `${actorName} added you to the team "${team.name}"`,
                        changedBy: req.user._id,
                        read: false
                    })
                ));
            }
        }

        if (removeMembers) {
            const removeIds = Array.isArray(removeMembers) ? removeMembers : [removeMembers];
            team.members = team.members.filter(m =>
                !removeIds.some(id => id.toString() === m.toString())
            );
        }

        await team.save();
        await team.populate('members', 'username email name fullName');
        await team.populate('owner', 'username email name fullName');

        res.json({
            success: true,
            team
        });
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// DELETE team
router.delete('/:id', protect, async (req, res) => {
    try {
        const team = await Team.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you don\'t have permission'
            });
        }

        // Find all projects under this team before deleting them
        const teamProjects = await Project.find({ team: req.params.id });
        const projectIds = teamProjects.map(p => p._id);

        // Delete all those projects
        await Project.deleteMany({ team: req.params.id });

        // Delete all tasks under those projects
        await Task.deleteMany({ project: { $in: projectIds } });

        // Clean up related notifications
        await Notification.deleteMany({ projectId: { $in: projectIds } });

        res.json({
            success: true,
            message: 'Team and all associated projects/tasks deleted successfully',
            id: req.params.id
        });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

module.exports = router;