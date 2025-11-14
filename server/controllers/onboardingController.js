const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

// @desc Check if user has completed onboarding
// @route GET /api/onboarding/status
// @access Private
const getOnboardingStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "senderName senderEmail brandName brandDescription automationGoals emailTone emailFrequency"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isCompleted =
    user.senderName &&
    user.senderEmail &&
    user.brandName &&
    user.brandDescription &&
    user.automationGoals.length > 0 &&
    user.emailTone &&
    user.emailFrequency;

  res.status(200).json({
    completed: !!isCompleted,
    user,
  });
});

// @desc Complete onboarding setup
// @route POST /api/onboarding/complete
// @access Private
const completeOnboarding = asyncHandler(async (req, res) => {
  const {
    senderName,
    senderEmail,
    brandName,
    brandDescription,
    automationGoals,
    emailTone,
    emailFrequency,
  } = req.body;

  if (
    !senderName ||
    !senderEmail ||
    !brandName ||
    !brandDescription ||
    !automationGoals ||
    !emailTone ||
    !emailFrequency
  ) {
    return res.status(400).json({
      message: "All onboarding fields are required",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      senderName,
      senderEmail,
      brandName,
      brandDescription,
      automationGoals,
      emailTone,
      emailFrequency,
    },
    { new: true }
  ).select("-password");

  res.status(200).json({
    message: "Onboarding completed successfully!",
    user: updatedUser,
  });
});

module.exports = {
  getOnboardingStatus,
  completeOnboarding,
};
