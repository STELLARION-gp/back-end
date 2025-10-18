// controllers/mentorMenteeConnection.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Get connection details between mentor and mentee
 */
export const getConnectionDetails = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        // Find the mentee application
        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) },
            include: {
                mentor: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        role: true
                    }
                },
                learner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        role: true
                    }
                }
            }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        // Verify user is either mentor or mentee
        if (application.mentor_id !== userId && application.learner_id !== userId) {
            res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to view this connection.' 
            });
            return;
        }

        // Get or create connection record
        let connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            // Create connection if accepted
            if (application.application_status === 'accepted') {
                connection = await prisma.mentor_mentee_connections.create({
                    data: {
                        application_id: application.application_id,
                        mentor_id: application.mentor_id,
                        mentee_id: application.learner_id,
                        status: 'active'
                    }
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                application,
                connection
            }
        });
    } catch (error: any) {
        console.error('Error getting connection details:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to get connection details.' 
        });
    }
};

/**
 * Create or update a note
 */
export const saveNote = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const { title, content, tags, isPinned } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        // Verify connection exists
        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        // Get or create connection
        let connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            connection = await prisma.mentor_mentee_connections.create({
                data: {
                    application_id: application.application_id,
                    mentor_id: application.mentor_id,
                    mentee_id: application.learner_id,
                    status: 'active'
                }
            });
        }

        // Only mentor may create notes for the connection
        if (application.mentor_id !== userId) {
            res.status(403).json({ success: false, error: 'Only the mentor may create notes for this connection.' });
            return;
        }

        // Create note (mentor is creator)
        const note = await prisma.mentor_mentee_notes.create({
            data: {
                connection_id: connection.connection_id,
                created_by: userId,
                title,
                content,
                tags: tags || [],
                is_pinned: isPinned || false
            }
        });

        res.status(201).json({
            success: true,
            data: note
        });
    } catch (error: any) {
        console.error('Error saving note:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to save note.' 
        });
    }
};

/**
 * Get all notes for a connection
 */
export const getNotes = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        const connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            res.status(200).json({
                success: true,
                data: []
            });
            return;
        }

        const notes = await prisma.mentor_mentee_notes.findMany({
            where: {
                connection_id: connection.connection_id
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true
                    }
                }
            },
            orderBy: [
                { is_pinned: 'desc' },
                { created_at: 'desc' }
            ]
        });

        res.status(200).json({
            success: true,
            data: notes
        });
    } catch (error: any) {
        console.error('Error getting notes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to get notes.' 
        });
    }
};

/**
 * Update a note
 */
export const updateNote = async (req: Request, res: Response) => {
    try {
        const { noteId } = req.params;
        const { title, content, tags, isPinned } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const note = await prisma.mentor_mentee_notes.findUnique({
            where: { note_id: parseInt(noteId) }
        });

        if (!note) {
            res.status(404).json({ 
                success: false, 
                error: 'Note not found.' 
            });
            return;
        }


        // Determine user's role relative to the connection
        const connection = await prisma.mentor_mentee_connections.findUnique({ where: { connection_id: note.connection_id } });
        const application = connection ? await prisma.mentee_applications.findUnique({ where: { application_id: connection.application_id } }) : null;

        const isCreator = note.created_by === userId;
        const isMentee = application && application.learner_id === userId;
        const isMentor = application && application.mentor_id === userId;

        // Mentee may only toggle pin/unpin (isPinned). Mentor (creator) may edit fully.
        if (isCreator) {
            const updatedNote = await prisma.mentor_mentee_notes.update({
                where: { note_id: parseInt(noteId) },
                data: {
                    title,
                    content,
                    tags,
                    is_pinned: isPinned,
                    updated_at: new Date()
                }
            });

            res.status(200).json({ success: true, data: updatedNote });
            return;
        }

        // If user is the mentee, allow only pin/unpin
        if (isMentee) {
            // Only allow updates that only change isPinned
            const hasOtherFields = title !== undefined || content !== undefined || tags !== undefined;
            if (hasOtherFields) {
                res.status(403).json({ success: false, error: 'Mentees may only pin or unpin notes.' });
                return;
            }

            const updatedNote = await prisma.mentor_mentee_notes.update({
                where: { note_id: parseInt(noteId) },
                data: {
                    is_pinned: isPinned,
                    updated_at: new Date()
                }
            });

            res.status(200).json({ success: true, data: updatedNote });
            return;
        }

        // Otherwise deny
        res.status(403).json({ success: false, error: 'You are not authorized to update this note.' });
        return;
    } catch (error: any) {
        console.error('Error updating note:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to update note.' 
        });
    }
};

/**
 * Delete a note
 */
export const deleteNote = async (req: Request, res: Response) => {
    try {
        const { noteId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const note = await prisma.mentor_mentee_notes.findUnique({
            where: { note_id: parseInt(noteId) }
        });

        if (!note) {
            res.status(404).json({ 
                success: false, 
                error: 'Note not found.' 
            });
            return;
        }

        // Allow deletion if the requester is the creator OR the mentee on the connection
        const connection = await prisma.mentor_mentee_connections.findUnique({ where: { connection_id: note.connection_id } });
        const application = connection ? await prisma.mentee_applications.findUnique({ where: { application_id: connection.application_id } }) : null;

        const isCreator = note.created_by === userId;
        const isMentee = application && application.learner_id === userId;

        if (!isCreator && !isMentee) {
            res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to delete this note.' 
            });
            return;
        }

        // Hard delete since schema doesn't have is_deleted
        await prisma.mentor_mentee_notes.delete({
            where: { note_id: parseInt(noteId) }
        });

        res.status(200).json({
            success: true,
            message: 'Note deleted successfully.'
        });
    } catch (error: any) {
        console.error('Error deleting note:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to delete note.' 
        });
    }
};

/**
 * Create a goal
 */
export const createGoal = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const { title, description, deadline, priority } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        let connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            connection = await prisma.mentor_mentee_connections.create({
                data: {
                    application_id: application.application_id,
                    mentor_id: application.mentor_id,
                    mentee_id: application.learner_id,
                    status: 'active'
                }
            });
        }

        const goal = await prisma.mentor_mentee_goals.create({
            data: {
                connection_id: connection.connection_id,
                created_by: userId,
                title,
                description,
                deadline: deadline ? new Date(deadline) : null,
                status: 'not_started'
            }
        });

        res.status(201).json({
            success: true,
            data: goal
        });
    } catch (error: any) {
        console.error('Error creating goal:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create goal.' 
        });
    }
};

/**
 * Get all goals for a connection
 */
export const getGoals = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        const connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            res.status(200).json({
                success: true,
                data: []
            });
            return;
        }

        const goals = await prisma.mentor_mentee_goals.findMany({
            where: {
                connection_id: connection.connection_id
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            data: goals
        });
    } catch (error: any) {
        console.error('Error getting goals:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to get goals.' 
        });
    }
};

/**
 * Update goal status and progress
 */
export const updateGoal = async (req: Request, res: Response) => {
    try {
        const { goalId } = req.params;
        const { title, description, status, progress, deadline } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const goal = await prisma.mentor_mentee_goals.findUnique({
            where: { goal_id: parseInt(goalId) }
        });

        if (!goal) {
            res.status(404).json({ 
                success: false, 
                error: 'Goal not found.' 
            });
            return;
        }

        const updatedGoal = await prisma.mentor_mentee_goals.update({
            where: { goal_id: parseInt(goalId) },
            data: {
                title,
                description,
                status,
                progress,
                deadline: deadline ? new Date(deadline) : goal.deadline,
                updated_at: new Date()
            }
        });

        res.status(200).json({
            success: true,
            data: updatedGoal
        });
    } catch (error: any) {
        console.error('Error updating goal:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to update goal.' 
        });
    }
};

/**
 * Create a mentor-mentee session (mentor schedules a session)
 * Body: { title, description, session_date, duration, meeting_link?, notes? }
 * meeting_link will be stored in the `notes` field alongside any additional notes.
 */
export const createSession = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const { title, description, session_date, duration, meeting_link, notes } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({ where: { application_id: parseInt(applicationId) } });

        if (!application) {
            res.status(404).json({ success: false, error: 'Connection not found.' });
            return;
        }

        // Only mentor can schedule sessions
        if (application.mentor_id !== userId) {
            res.status(403).json({ success: false, error: 'Only the mentor can schedule sessions.' });
            return;
        }

        let connection = await prisma.mentor_mentee_connections.findFirst({
            where: { mentor_id: application.mentor_id, mentee_id: application.learner_id }
        });

        if (!connection) {
            connection = await prisma.mentor_mentee_connections.create({
                data: {
                    application_id: application.application_id,
                    mentor_id: application.mentor_id,
                    mentee_id: application.learner_id,
                    status: 'active'
                }
            });
        }

        // Combine meeting_link into notes field as simple JSON-ish string if provided
        let notesToStore: string | undefined = notes || null;
        if (meeting_link) {
            const meetingNote = `meeting_link:${meeting_link}`;
            notesToStore = notesToStore ? `${notesToStore}\n${meetingNote}` : meetingNote;
        }

        const session = await prisma.mentor_mentee_sessions.create({
            data: {
                connection_id: connection.connection_id,
                title: title || 'Session',
                description: description || null,
                session_date: new Date(session_date),
                duration: Number(duration) || 60,
                notes: notesToStore || null
            }
        });

        res.status(201).json({ success: true, data: session });
    } catch (error: any) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create session.' });
    }
};

/**
 * Get all sessions for a connection
 */
export const getSessions = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({ where: { application_id: parseInt(applicationId) } });

        if (!application) {
            res.status(404).json({ success: false, error: 'Connection not found.' });
            return;
        }

        // Only mentor or mentee can view
        if (application.mentor_id !== userId && application.learner_id !== userId) {
            res.status(403).json({ success: false, error: 'You are not authorized to view sessions for this connection.' });
            return;
        }

        const connection = await prisma.mentor_mentee_connections.findFirst({
            where: { mentor_id: application.mentor_id, mentee_id: application.learner_id }
        });

        if (!connection) {
            res.status(200).json({ success: true, data: [] });
            return;
        }

        const sessions = await prisma.mentor_mentee_sessions.findMany({
            where: { connection_id: connection.connection_id },
            orderBy: { session_date: 'desc' }
        });

        res.status(200).json({ success: true, data: sessions });
    } catch (error: any) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to get sessions.' });
    }
};

/**
 * Update a scheduled session (mentor only)
 */
export const updateSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { title, description, session_date, duration, meeting_link, notes } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
            return;
        }

        const session = await prisma.mentor_mentee_sessions.findUnique({ where: { session_id: parseInt(sessionId) } });

        if (!session) {
            res.status(404).json({ success: false, error: 'Session not found.' });
            return;
        }

        // Retrieve connection and application to verify mentor
        const connection = await prisma.mentor_mentee_connections.findFirst({ where: { connection_id: session.connection_id } });

        if (!connection) {
            res.status(404).json({ success: false, error: 'Connection not found.' });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({ where: { application_id: connection.application_id } });

        if (!application) {
            res.status(404).json({ success: false, error: 'Application not found.' });
            return;
        }

        if (application.mentor_id !== userId) {
            res.status(403).json({ success: false, error: 'Only the mentor can update the session.' });
            return;
        }

        // Merge meeting_link into notes similar to create
        let notesToStore = notes ?? session.notes ?? null;
        if (meeting_link) {
            const meetingNote = `meeting_link:${meeting_link}`;
            notesToStore = notesToStore ? `${notesToStore}\n${meetingNote}` : meetingNote;
        }

        const updated = await prisma.mentor_mentee_sessions.update({
            where: { session_id: parseInt(sessionId) },
            data: {
                title: title ?? session.title,
                description: description ?? session.description,
                session_date: session_date ? new Date(session_date) : session.session_date,
                duration: duration ? Number(duration) : session.duration,
                notes: notesToStore,
                // updated_at not present in model; created_at only
            }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Error updating session:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update session.' });
    }
};

/**
 * Delete a scheduled session (mentor only)
 */
export const deleteSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
            return;
        }

        const session = await prisma.mentor_mentee_sessions.findUnique({ where: { session_id: parseInt(sessionId) } });

        if (!session) {
            res.status(404).json({ success: false, error: 'Session not found.' });
            return;
        }

        const connection = await prisma.mentor_mentee_connections.findFirst({ where: { connection_id: session.connection_id } });

        if (!connection) {
            res.status(404).json({ success: false, error: 'Connection not found.' });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({ where: { application_id: connection.application_id } });

        if (!application) {
            res.status(404).json({ success: false, error: 'Application not found.' });
            return;
        }

        if (application.mentor_id !== userId) {
            res.status(403).json({ success: false, error: 'Only the mentor can delete the session.' });
            return;
        }

        await prisma.mentor_mentee_sessions.delete({ where: { session_id: parseInt(sessionId) } });

        res.status(200).json({ success: true, message: 'Session deleted successfully.' });
    } catch (error: any) {
        console.error('Error deleting session:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete session.' });
    }
};

/**
 * End mentorship connection
 */
export const endConnection = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        const { reason } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({
            where: { application_id: parseInt(applicationId) }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection not found.' 
            });
            return;
        }

        // Only mentor can end connection
        if (application.mentor_id !== userId) {
            res.status(403).json({ 
                success: false, 
                error: 'Only the mentor can end the connection.' 
            });
            return;
        }

        const connection = await prisma.mentor_mentee_connections.findFirst({
            where: {
                mentor_id: application.mentor_id,
                mentee_id: application.learner_id
            }
        });

        if (!connection) {
            res.status(404).json({ 
                success: false, 
                error: 'Connection record not found.' 
            });
            return;
        }

        await prisma.mentor_mentee_connections.update({
            where: { connection_id: connection.connection_id },
            data: {
                status: 'ended',
                ended_at: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: 'Connection ended successfully.'
        });
    } catch (error: any) {
        console.error('Error ending connection:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to end connection.' 
        });
    }
};
