const express = require("express");
const router = express.Router();
const {
  getOnboardingStatus,
  completeOnboarding,
} = require("../controllers/onboardingController");

const verifyToken = require("../middleware/verifyTokenHandler");

// Check onboarding progress
router.get("/status", verifyToken, getOnboardingStatus);

// Save onboarding data
router.post("/complete", verifyToken, completeOnboarding);

module.exports = router;
