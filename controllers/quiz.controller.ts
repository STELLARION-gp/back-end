import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, fail } from '../utils/responses';
import { CreateQuizRequest, UpdateQuizRequest, SubmitQuizAnswersRequest } from '../types';

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const quizData: CreateQuizRequest = req.body;

    // Validate required fields
    if (!quizData.title || !quizData.category || !quizData.level || !quizData.time_limit) {
      return fail(res, 400, 'Missing required fields');
    }

    // Validate questions
    if (!quizData.questions || quizData.questions.length === 0) {
      return fail(res, 400, 'Quiz must have at least one question');
    }

    // Validate each question
    for (const question of quizData.questions) {
      if (!question.question || !question.answers || question.answers.length < 2) {
        return fail(res, 400, 'Each question must have a question text and at least 2 answers');
      }
      if (!question.correct_answer) {
        return fail(res, 400, 'Each question must have a correct answer');
      }
      if (!question.answers.includes(question.correct_answer)) {
        return fail(res, 400, 'Correct answer must be one of the provided answers');
      }
    }

    // Create quiz with transaction to ensure all related data is created
    const quiz = await prisma.$transaction(async (tx) => {
      // Create the quiz
      const newQuiz = await tx.quizzes.create({
        data: {
          name: quizData.title,
          category: quizData.category,
          description: quizData.description || '',
          level: quizData.level,
          time_limit: quizData.time_limit,
          user_id: userId,
          status: 'open',
          question_count: quizData.questions.length,
          modified_at: new Date(),
        },
      });

      // Create quiz questions
      const questionsData = quizData.questions.map((question) => ({
        quiz_id: newQuiz.id,
        question: question.question,
        answers: question.answers,
        correct_answer: question.correct_answer,
        question_explanation: question.question_explanation || null,
      }));

      await tx.quizQuestion.createMany({
        data: questionsData,
      });

      return newQuiz;
    });

    // Fetch the complete quiz with questions
    const completeQuiz = await prisma.quizzes.findUnique({
      where: { id: quiz.id },
      include: {
        QuizQuestion: true,
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // Transform to match expected format
    const result = {
      ...completeQuiz,
      creator: completeQuiz?.users,
      questions: completeQuiz?.QuizQuestion,
    };

    ok(res, 'Quiz created successfully', result);
  } catch (error) {
    console.error('Error creating quiz:', error);
    fail(res, 500, 'Failed to create quiz');
  }
};

// Get all available quizzes (not created by user)
export const getAllQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizzes = await prisma.quizzes.findMany({
      where: { 
        status: 'open',
        user_id: { not: userId } // Exclude user's own quizzes
      },
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
          },
        },
        QuizQuestion: {
          select: {
            id: true,
            question: true,
            answers: true,
            question_explanation: true,
            // Don't include correct_answer in list view
          }
        },
        QuizParticipants: {
          where: { user_id: userId },
          select: {
            id: true,
            score: true,
            correct_question_count: true,
          }
        },
      },
    });

    // Add computed fields and transform creator
    const quizzesWithMetadata = quizzes.map(quiz => ({
      ...quiz,
      creator: quiz.users,
      questions: quiz.QuizQuestion,
      participants: quiz.QuizParticipants,
      hasParticipated: quiz.QuizParticipants.length > 0,
      userScore: quiz.QuizParticipants[0]?.score || null,
    }));

    ok(res, 'Quizzes fetched successfully', { quizzes: quizzesWithMetadata });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    fail(res, 500, 'Failed to fetch quizzes');
  }
};

// Get quizzes created by the user
export const getMyQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');
    
    const quizzes = await prisma.quizzes.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
          },
        },
        QuizQuestion: true,
        QuizParticipants: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true,
              }
            }
          }
        },
      },
    });

    // Transform to add creator field
    const transformedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      creator: quiz.users,
      questions: quiz.QuizQuestion,
      participants: quiz.QuizParticipants,
    }));

    ok(res, 'Your quizzes fetched successfully', { quizzes: transformedQuizzes });
  } catch (error) {
    console.error('Error fetching my quizzes:', error);
    fail(res, 500, 'Failed to fetch your quizzes');
  }
};

// Get quiz leaderboard
export const getQuizLeaderboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    // Get all participants with their stats
    const participants = await prisma.quizParticipants.groupBy({
      by: ['user_id'],
      _sum: {
        score: true,
      },
      _avg: {
        score: true,
      },
      _count: {
        id: true,
      },
    });

    // Get user details for each participant
    const leaderboardData = await Promise.all(
      participants.map(async (participant) => {
        const user = await prisma.users.findUnique({
          where: { id: participant.user_id },
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        });

        return {
          user_id: participant.user_id,
          username: user?.display_name || user?.email || 'Unknown',
          display_name: user?.display_name,
          first_name: user?.first_name,
          last_name: user?.last_name,
          total_score: participant._sum.score || 0,
          quizzes_completed: participant._count.id,
          average_score: Math.round(participant._avg.score || 0),
        };
      })
    );

    // Sort by total score and assign ranks
    leaderboardData.sort((a, b) => b.total_score - a.total_score);
    const leaderboard = leaderboardData.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Calculate stats
    const stats = {
      totalParticipants: leaderboard.length,
      totalQuizAttempts: participants.reduce((sum, p) => sum + p._count.id, 0),
      averageScore: leaderboard.length > 0 
        ? Math.round(leaderboard.reduce((sum, e) => sum + e.average_score, 0) / leaderboard.length)
        : 0,
      highestScore: leaderboard.length > 0 ? leaderboard[0].total_score : 0,
    };

    // Find user's rank if authenticated
    let userRank = undefined;
    if (userId) {
      const userEntry = leaderboard.find(entry => entry.user_id === userId);
      if (userEntry) {
        userRank = {
          rank: userEntry.rank,
          entry: userEntry,
        };
      }
    }

    ok(res, 'Leaderboard fetched successfully', {
      leaderboard,
      stats,
      userRank,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    fail(res, 500, 'Failed to fetch leaderboard');
  }
};

// Get quiz by ID
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const quizId = parseInt(req.params.id);

    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
          },
        },
        QuizQuestion: {
          select: {
            id: true,
            question: true,
            answers: true,
            question_explanation: true,
            // Include correct_answer only if user is the creator
          }
        },
        QuizParticipants: userId ? {
          where: { user_id: userId },
        } : false,
      },
    });

    if (!quiz) {
      return fail(res, 404, 'Quiz not found');
    }

    // If user is the creator, include correct answers
    let result: any = { ...quiz, creator: quiz.users, questions: quiz.QuizQuestion, participants: quiz.QuizParticipants };
    
    if (quiz.user_id === userId) {
      const questionsWithAnswers = await prisma.quizQuestion.findMany({
        where: { quiz_id: quizId },
      });
      result.questions = questionsWithAnswers;
    }

    ok(res, 'Quiz fetched successfully', result);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    fail(res, 500, 'Failed to fetch quiz');
  }
};

// Update quiz
export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    const updateData: UpdateQuizRequest = req.body;

    // Check if quiz exists and user is the creator
    const existingQuiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
    });

    if (!existingQuiz) {
      return fail(res, 404, 'Quiz not found');
    }

    if (existingQuiz.user_id !== userId) {
      return fail(res, 403, 'You can only update your own quizzes');
    }

    // Update quiz with transaction
    const updatedQuiz = await prisma.$transaction(async (tx) => {
      // Update quiz basic info
      const quiz = await tx.quizzes.update({
        where: { id: quizId },
        data: {
          name: updateData.title,
          category: updateData.category,
          description: updateData.description,
          level: updateData.level,
          time_limit: updateData.time_limit,
          status: updateData.status,
          question_count: updateData.questions?.length || existingQuiz.question_count,
          modified_at: new Date(),
        },
      });

      // If questions are provided, update them
      if (updateData.questions && updateData.questions.length > 0) {
        // Delete existing questions
        await tx.quizQuestion.deleteMany({
          where: { quiz_id: quizId },
        });

        // Create new questions
        const questionsData = updateData.questions.map((question) => ({
          quiz_id: quizId,
          question: question.question,
          answers: question.answers,
          correct_answer: question.correct_answer,
          question_explanation: question.question_explanation || null,
        }));

        await tx.quizQuestion.createMany({
          data: questionsData,
        });
      }

      return quiz;
    });

    // Fetch complete updated quiz
    const completeQuiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      include: {
        QuizQuestion: true,
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    const result = {
      ...completeQuiz,
      creator: completeQuiz?.users,
      questions: completeQuiz?.QuizQuestion,
    };

    ok(res, 'Quiz updated successfully', result);
  } catch (error) {
    console.error('Error updating quiz:', error);
    fail(res, 500, 'Failed to update quiz');
  }
};

// Delete quiz
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    // Check if quiz exists and user is the creator
    const existingQuiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
    });

    if (!existingQuiz) {
      return fail(res, 404, 'Quiz not found');
    }

    if (existingQuiz.user_id !== userId) {
      return fail(res, 403, 'You can only delete your own quizzes');
    }

    // Delete quiz (cascade will delete questions and participants)
    await prisma.quizzes.delete({
      where: { id: quizId },
    });

    ok(res, 'Quiz deleted successfully', null);
  } catch (error) {
    console.error('Error deleting quiz:', error);
    fail(res, 500, 'Failed to delete quiz');
  }
};

// Start quiz (record that user started the quiz)
export const startQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    // Get quiz with questions
    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      include: {
        QuizQuestion: true,
      },
    });

    if (!quiz) {
      return fail(res, 404, 'Quiz not found');
    }

    if (quiz.status !== 'open') {
      return fail(res, 400, 'Quiz is not available');
    }

    // Check if user already participated
    const existingParticipation = await prisma.quizParticipants.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
      },
    });

    if (existingParticipation) {
      return fail(res, 400, 'You have already taken this quiz');
    }

    ok(res, 'Quiz started successfully', { 
      quiz: {
        id: quiz.id,
        name: quiz.name,
        time_limit: quiz.time_limit,
        questions: quiz.QuizQuestion,
      }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    fail(res, 500, 'Failed to start quiz');
  }
};

// Submit quiz answers
export const submitQuizAnswers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    const { answers }: SubmitQuizAnswersRequest = req.body;

    if (!answers || !Array.isArray(answers)) {
      return fail(res, 400, 'Invalid answers format');
    }

    // Get quiz with questions
    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      include: {
        QuizQuestion: true,
      },
    });

    if (!quiz) {
      return fail(res, 404, 'Quiz not found');
    }

    // Check if user already participated
    const existingParticipation = await prisma.quizParticipants.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
      },
    });

    if (existingParticipation) {
      return fail(res, 400, 'You have already submitted answers for this quiz');
    }

    // Calculate score
    let correctCount = 0;
    const results = answers.map(answer => {
      const question = quiz.QuizQuestion.find(q => q.id === answer.question_id);
      if (!question) {
        return null;
      }

      const isCorrect = answer.selected_answer === question.correct_answer;
      if (isCorrect) correctCount++;

      return {
        question_id: question.id,
        question: question.question,
        selected_answer: answer.selected_answer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        explanation: question.question_explanation,
      };
    }).filter(r => r !== null);

    const score = Math.round((correctCount / quiz.QuizQuestion.length) * 100);

    // Save participation record
    await prisma.$transaction(async (tx) => {
      await tx.quizParticipants.create({
        data: {
          quiz_id: quizId,
          user_id: userId,
          correct_question_count: correctCount,
          score: score,
        },
      });

      // Update participants count
      await tx.quizzes.update({
        where: { id: quizId },
        data: {
          participants_count: {
            increment: 1,
          },
        },
      });
    });

    ok(res, 'Quiz submitted successfully', {
      quiz_id: quizId,
      score,
      correct_answers: correctCount,
      total_questions: quiz.QuizQuestion.length,
      percentage: score,
      answers: results,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    fail(res, 500, 'Failed to submit quiz');
  }
};

// Get all results for a quiz (for quiz creator)
export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    // Check if quiz exists and user is the creator
    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return fail(res, 404, 'Quiz not found');
    }

    if (quiz.user_id !== userId) {
      return fail(res, 403, 'You can only view results for your own quizzes');
    }

    // Get all participants
    const results = await prisma.quizParticipants.findMany({
      where: { quiz_id: quizId },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        score: 'desc',
      },
    });

    ok(res, 'Quiz results fetched successfully', { results });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    fail(res, 500, 'Failed to fetch quiz results');
  }
};

// Get user's result for a specific quiz
export const getMyQuizResult = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return fail(res, 401, 'Unauthorized');

    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) {
      return fail(res, 400, 'Invalid quiz ID');
    }

    const result = await prisma.quizParticipants.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
      },
      include: {
        Quizzes: {
          select: {
            id: true,
            name: true,
            question_count: true,
          }
        },
      },
    });

    if (!result) {
      return fail(res, 404, 'No result found for this quiz');
    }

    ok(res, 'Quiz result fetched successfully', {
      quiz_id: result.quiz_id,
      score: result.score,
      correct_answers: result.correct_question_count,
      total_questions: result.Quizzes.question_count,
      percentage: result.score,
    });
  } catch (error) {
    console.error('Error fetching quiz result:', error);
    fail(res, 500, 'Failed to fetch quiz result');
  }
};