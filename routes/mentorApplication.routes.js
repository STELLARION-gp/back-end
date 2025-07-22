"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/mentorApplication.routes.ts
const express_1 = require("express");
const mentorApplication_controller_1 = require("../controllers/mentorApplication.controller");
const { emergencyBypass } = require("../emergency-bypass.js"); // EMERGENCY BYPASS
const router = (0, express_1.Router)();
router.post('/', emergencyBypass, mentorApplication_controller_1.createMentorApplication);
router.get('/', emergencyBypass, mentorApplication_controller_1.getMentorApplications);
router.get('/:id', emergencyBypass, mentorApplication_controller_1.getMentorApplication);
router.put('/:id', emergencyBypass, mentorApplication_controller_1.updateMentorApplication);
router.delete('/:id', emergencyBypass, mentorApplication_controller_1.deleteMentorApplication);
router.patch('/:id/status', emergencyBypass, mentorApplication_controller_1.changeMentorApplicationStatus);
exports.default = router;
