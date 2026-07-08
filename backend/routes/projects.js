const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');

// Get projects
router.get('/', protect, async (req, res) => {
    try {
        const teams = await Team.find({
            $or: [
                { owner: req.user._id },
                { 'members._id': req.user._id }
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

            // Only team owner can create team projects
            if (team.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Only team owner can create projects for this team"
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
        
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user._id // Only project owner can update
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or you don\'t have permission'
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
        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id // Only project owner can delete
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or you don\'t have permission'
            });
        }

        await Task.deleteMany({
            project: req.params.id,
            owner: req.user._id
        });

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