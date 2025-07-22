"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/influencerApplication.routes.ts
const express_1 = require("express");
const influencerApplication_controller_1 = require("../controllers/influencerApplication.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const router = (0, express_1.Router)();
router.post('/', verifyToken_1.verifyToken, influencerApplication_controller_1.createInfluencerApplication);
router.get('/', verifyToken_1.verifyToken, influencerApplication_controller_1.getInfluencerApplications);
router.get('/:id', verifyToken_1.verifyToken, influencerApplication_controller_1.getInfluencerApplication);
router.put('/:id', verifyToken_1.verifyToken, influencerApplication_controller_1.updateInfluencerApplication);
router.delete('/:id', verifyToken_1.verifyToken, influencerApplication_controller_1.deleteInfluencerApplication);
router.patch('/:id/status', verifyToken_1.verifyToken, influencerApplication_controller_1.changeInfluencerApplicationStatus);
exports.default = router;
