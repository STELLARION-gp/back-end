"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/guideApplication.routes.ts
const express_1 = require("express");
const guideApplication_controller_1 = require("../controllers/guideApplication.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const router = (0, express_1.Router)();
router.post('/', verifyToken_1.verifyToken, guideApplication_controller_1.createGuideApplication);
router.get('/', verifyToken_1.verifyToken, guideApplication_controller_1.getGuideApplications);
router.get('/:id', verifyToken_1.verifyToken, guideApplication_controller_1.getGuideApplication);
router.put('/:id', verifyToken_1.verifyToken, guideApplication_controller_1.updateGuideApplication);
router.delete('/:id', verifyToken_1.verifyToken, guideApplication_controller_1.deleteGuideApplication);
router.patch('/:id/status', verifyToken_1.verifyToken, guideApplication_controller_1.changeGuideApplicationStatus);
exports.default = router;
