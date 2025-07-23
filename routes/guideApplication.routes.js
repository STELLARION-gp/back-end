"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/guideApplication.routes.ts
const express_1 = require("express");
const guideApplication_controller_1 = require("../controllers/guideApplication.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const roleAuth_1 = require("../middleware/roleAuth");
const router = (0, express_1.Router)();
// Multer configuration for file uploads
const uploadFields = guideApplication_controller_1.upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'certifications', maxCount: 1 },
    { name: 'portfolio', maxCount: 1 },
    { name: 'references', maxCount: 1 }
]);
// All routes require authentication
router.use(verifyToken_1.verifyToken);
// User routes (learners can apply)
router.post('/', uploadFields, guideApplication_controller_1.createGuideApplication);
router.get('/my-applications', guideApplication_controller_1.getUserGuideApplications);
router.get('/:id', guideApplication_controller_1.getGuideApplication);
router.put('/:id', uploadFields, guideApplication_controller_1.updateGuideApplication);
router.delete('/:id', guideApplication_controller_1.deleteGuideApplication);
// Admin/Moderator routes (manage applications)
router.get('/', (0, roleAuth_1.requireRole)(['admin', 'moderator']), guideApplication_controller_1.getGuideApplications);
router.patch('/:id/status', (0, roleAuth_1.requireRole)(['admin', 'moderator']), guideApplication_controller_1.changeGuideApplicationStatus);
exports.default = router;
