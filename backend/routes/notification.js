const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get all not for curr user
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            userId: req.user._id 
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('changedBy', 'username fullName name')
        .populate('taskId', 'title')
        .populate('projectId', 'name');

        // Count unread
        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            read: false
        });
        
        res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch notifications' 
        });
    }
});

// Mark a single not as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { read: true },
            { new: true }
        );
        
        if (!notification) {
            return res.status(404).json({ 
                success: false,
                message: 'Notification not found' 
            });
        }
        
        res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to mark notification as read' 
        });
    }
});

// Mark all not as read
router.put('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to mark all notifications as read' 
        });
    }
});

// Delete a not
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user._id
        });
        
        if (!notification) {
            return res.status(404).json({ 
                success: false,
                message: 'Notification not found' 
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete notification' 
        });
    }
});

module.exports = router;