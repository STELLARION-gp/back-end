import express from 'express';
import { getAllQuizzes, getMyQuizzes, getQuizLeaderboard, getQuizById, createQuiz, updateQuiz, deleteQuiz, startQuiz, submitQuizAnswers, getQuizResults, getMyQuizResult } from '../controllers/quiz.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// Quiz routes
router.get('/', verifyToken, getAllQuizzes);
router.get('/my', verifyToken, getMyQuizzes);
router.get('/leaderboard', verifyToken, getQuizLeaderboard);



router.get('/:id', verifyToken, getQuizById);

// CRUD routes
router.post('/', verifyToken, createQuiz);
router.put('/:id', verifyToken, updateQuiz);
router.delete('/:id', verifyToken, deleteQuiz);

// Quiz participation routes
router.post('/:id/start', verifyToken, startQuiz);
router.post('/:id/submit', verifyToken, submitQuizAnswers);
router.get('/:id/results', verifyToken, getQuizResults);
router.get('/:id/my-result', verifyToken, getMyQuizResult);

export default router;
