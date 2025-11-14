const express = require('express');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail'); 
const Users = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler')
;const { getGmailEmails } = require('../controllers/gmailController');

// ←←← THIS IS THE CORRECT WAY
const getEmails = async (req, res) => {
  try {
    const user = await Users.findById(req.user._id).select('accessToken refreshToken tokenExpiresAt');

    if (!user?.accessToken) {
      return res.status(400).json({ success: false, message: 'Gmail not connected' });
    }

    const { pageToken, limit = '10' } = req.query;

    const emails = await getGmailEmails(user, {
      pageToken: pageToken?.toString(),
      maxResults: parseInt(limit, 10),
    });

    res.json({ success: true, data: emails });
  } catch (error) {
    console.error('Gmail fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//@desc: Get All Users
//@api : API/USERS
//@method : get, private
const getUsers = asyncHandler(async (req, res) => {
  const users = await Users.find()
    .select("username firstname lastname email avatar")
    .sort({ createdAt: -1 });

  if (!users || users.length === 0) {
    return res.status(400).json({ message: "No users found!" });
  }

  res.status(200).json(users);
});



// Helper function to get existing bond user IDs
const getExistingBondUserIds = async (userId) => {
  try {
    const Bond = require('../models/bondModel');
    const existingBonds = await Bond.find({
      $or: [{ initiator: userId }, { recipient: userId }]
    }).lean();

    return existingBonds.map(bond => 
      bond.initiator.toString() === userId ? bond.recipient : bond.initiator
    );
  } catch (error) {
    console.error('Error getting existing bond user IDs:', error);
    return [];
  }
};

// Helper function for geocoding location strings to coordinates
const geocodeLocation = async (locationString) => {
  try {
    // Using OpenStreetMap Nominatim API (free)
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: locationString,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'YourAppName/1.0' // Required by Nominatim
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return [parseFloat(result.lon), parseFloat(result.lat)];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

//@desc: Get user's current geographic location
//@api: GET /api/users/current/geolocation
//@method: private
const getCurrentUserGeolocation = asyncHandler(async (req, res) => {
  const user = await Users.findById(req.user.id).select('geoLocation location');
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    location: user.location,
    geoLocation: user.geoLocation,
    hasGeographicData: !!user.geoLocation
  });
});


//@desc: Get All Users
//@api : API/USERS
//@method : get, private
const getHomeUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { firstname: { $regex: search, $options: 'i' } },
          { lastname: { $regex: search, $options: 'i' } },
        ],
      }
    : {};
  const users = await Users.find(query).select('username firstname lastname avatar bio');
  if (!users.length) {
    res.status(400).json({ message: 'No users found!' });
  }
  res.status(200).json(users);
});

//@desc: Get Home User By ID
//@api : API/USERS/:id
//@method : get, private
const getHomeUserById = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID');
  }

  const user = await Users.findById(id).select('username firstname lastname avatar bio');;
  if (!user) {
    res.status(404);
    throw new Error('No user with this ID found!');
  }

  res.status(200).json(user);
});
//@desc: Get User By ID
//@api : API/USERS/:id
//@method : get, private
const getUserById = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID');
  }

  const user = await Users.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('No user with this ID found!');
  }

  res.status(200).json(user);
});

//@desc: Create New User
//@api: API/USERS
//@method: post, private
const createUser = asyncHandler(async (req, res) => {
  const { username, firstname, lastname, email, password, confirm_password } = req.body;


  if (!username || !firstname || !lastname || !email || !password || !confirm_password) {
    console.log('Missing required fields');
    return res.status(400).json({ message: "All fields are mandatory!" });
  }

  if (password.startsWith('$2b$')) {
    return res.status(400).json({ message: "Password must be plaintext, not a hash." });
  }

  const normalizedEmail = email.toLowerCase();
  const registeredEmail = await Users.findOne({ email: normalizedEmail });
  const registeredUsername = await Users.findOne({ username });

  if (registeredUsername) {
    console.log('Username already taken:', username);
    return res.status(400).json({ message: "Username already used. Try another one!" });
  }
  if (registeredEmail) {
    console.log('Email already in use:', normalizedEmail);
    return res.status(400).json({ message: "Email already in use." });
  }
  if (password !== confirm_password) {
    console.log('Password mismatch');
    return res.status(400).json({ message: "Password should match!" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new Users({
    username,
    firstname,
    lastname,
    email: normalizedEmail,
    password: hashedPassword,
  });

  await user.save();

  if (!user) {
    console.log('Failed to create user');
    return res.status(400).json({ message: "Can't create user!" });
  }

  res.status(201).json({
    _id: user._id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
  });
});
//@desc: Verify Token
//@api: API/USERS/VERIFY-TOKEN
//@method: get, private
const verifyLoginToken = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRECT_KEY);
    const user = await Users.findById(decoded.user.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Token is valid",
      user: {
        id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token has expired" });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error verifying token" });
  }
});

//@desc: Login User
//@api: API/LOGIN
//@method: post,private
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;


  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase();

  const user = await Users.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    return res.status(400).json({ message: "No users with this email found." });
  }


  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: "Email or Password Incorrect." });
  }

  const accessToken = jwt.sign(
    {
      user: {
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        id: user._id,
      },
    },
    process.env.SECRECT_KEY,
    { expiresIn: "7d" }
  );


  res.status(200).json({
    accesstoken: accessToken,
    user: {
      id: user._id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      avatar: user.avatar,
    },
  });
});

//@desc: Get current user
//@api: API/CURRENT
//@method: get, private
const currentUser = asyncHandler(async (req, res) => {
  const user = await Users.findById(req.user.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({
    id: user._id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
    geoLocation: user.geoLocation || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

//@desc: Set geographic location coordinates
//@api: POST /api/users/set-location
//@method: private
const setGeographicLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, locationName } = req.body;
  
  if (!latitude || !longitude) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  const updateData = {
    geoLocation: {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    }
  };

  // If location name is provided, update the string location too
  if (locationName) {
    updateData.location = locationName;
  }

  const updatedUser = await Users.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, select: "-password" }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    message: "Geographic location updated successfully",
    user: updatedUser
  });
});

//@desc: Get location-based recommendations
//@api: GET /api/users/recommendations/location
//@method: private
//@desc: Get location-based recommendations
//@api: GET /api/bonds/recommendations/location
//@method: private
const getLocationBasedRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { maxDistance = 50 } = req.query;

  console.log('📍 Location Recommendations - User ID:', userId);
  console.log('📍 Max Distance:', maxDistance);

  const user = await User.findById(userId);
  
  if (!user) {
    console.log('📍 User not found');
    return res.json({ 
      success: true, 
      data: [], 
      message: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!user.geoLocation || !user.geoLocation.coordinates) {
    console.log('📍 User geographic location not set:', {
      hasGeoLocation: !!user.geoLocation,
      hasCoordinates: user.geoLocation?.coordinates ? 'Yes' : 'No',
      coordinates: user.geoLocation?.coordinates
    });
    return res.json({ 
      success: true, 
      data: [], 
      message: 'User geographic location not set',
      timestamp: new Date().toISOString()
    });
  }

  console.log('📍 User location coordinates:', user.geoLocation.coordinates);

  // Get existing bonds to exclude
  const existingBondUserIds = await getExistingBondUserIds(userId);
  console.log('📍 Existing bond user IDs to exclude:', existingBondUserIds.length);

  try {
    // First, let's check if there are any users with geoLocation
    const usersWithGeoLocation = await User.countDocuments({
      'geoLocation.coordinates': { $exists: true, $ne: null },
      _id: { $ne: new mongoose.Types.ObjectId(userId) }
    });
    console.log('📍 Users with geoLocation (excluding self):', usersWithGeoLocation);

    const recommendations = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: user.geoLocation.coordinates
          },
          distanceField: 'distance',
          maxDistance: parseInt(maxDistance) * 1000, // Convert km to meters
          spherical: true,
          query: {
            _id: { 
              $ne: new mongoose.Types.ObjectId(userId),
              $nin: existingBondUserIds
            },
            'geoLocation.coordinates': { 
              $exists: true,
              $ne: null
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          firstname: 1,
          lastname: 1,
          avatar: 1,
          location: 1,
          distance: 1,
          score: {
            $divide: [100, { $max: [1, { $divide: ['$distance', 1000] }] }]
          }
        }
      },
      {
        $sort: { distance: 1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log('📍 Recommendations found:', recommendations.length);
    console.log('📍 Sample recommendations:', recommendations.slice(0, 2));

    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in location-based recommendations:', error);
    res.json({
      success: true,
      data: [],
      message: 'Error fetching location-based recommendations',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc: Update user profile
// @api: PUT /api/users/current
// @method: private
const updateProfile = asyncHandler(async (req, res) => {
  const { firstname, lastname, username, bio, location, website } = req.body;
  
  // Validate username if provided
  if (username) {
    const existingUser = await Users.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      res.status(400);
      throw new Error("Username is already taken");
    }
  }

  // Prepare update data
  const updateData = { firstname, lastname, username, bio, website };
  
  // Handle location - store both string and geographic coordinates
  if (location && location.trim() !== '') {
    updateData.location = location;
    
    // Try to geocode the location to get coordinates
    try {
      const coordinates = await geocodeLocation(location);
      if (coordinates) {
        updateData.geoLocation = {
          type: 'Point',
          coordinates: coordinates
        };
      }
    } catch (error) {
      console.log('Geocoding failed, storing location as string only:', error.message);
      // Remove any existing geoLocation if geocoding fails
      updateData.$unset = { geoLocation: "" };
    }
  } else {
    // If location is empty, remove both location and geoLocation
    updateData.location = '';
    updateData.$unset = { geoLocation: "" };
  }

  const updatedUser = await Users.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, select: "-password" }
  );
  
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }
  
  res.status(200).json(updatedUser);
});


// @desc: Upload profile picture
// @api: POST /api/users/upload-profile
// @method: private
// @desc: Upload profile picture 
// @route: POST /api/users/upload-profile
// @access: Private
const uploadProfilePicture = asyncHandler(async (req, res) => {
  //  The field name should match what frontend sends: "profile"
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  //  Construct the avatar URL based on where your files are stored
  const avatarUrl = `/storage/profile-pictures/${req.file.filename}`;

  try {
    // Update user and exclude password
    const updatedUser = await Users.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Send back success response
    res.status(200).json({
      message: "Profile picture uploaded successfully",
      avatarUrl: updatedUser.avatar,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        location: updatedUser.location,
        website: updatedUser.website,
      },
    });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    res.status(500).json({ message: "Server error updating profile picture" });
  }
});





//@desc: Check Username Availability
//@api: POST /api/users/check-username
//@method: private
const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === "") {
    res.status(400);
    throw new Error("Username is required and cannot be empty");
  }
  // Optional: Validate format (adjust regex as needed)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    res.status(400);
    throw new Error("Username must be 3-20 characters, alphanumeric or underscore only");
  }
  const currentUser = await Users.findById(req.user.id);
  if (currentUser.username === username) {
    return res.status(200).json({ available: true, message: "This is your current username" });
  }
  const existingUser = await Users.findOne({ username });
  if (existingUser) {
    res.status(200).json({ available: false, message: "Username is already taken" }); // Changed to 200
  } else {
    res.status(200).json({ available: true, message: "Username is available" });
  }
});

const getUserIdByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }).select('_id');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json({ userId: user._id });
});

//@desc: Request Password Reset
//@api: POST /api/users/forgot-password
//@method: public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const normalizedEmail = email.toLowerCase();
  const user = await Users.findOne({ email: normalizedEmail });

  if (!user) {
    res.status(404);
    throw new Error('No user found with this email');
  }

  // Generate a 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = crypto.createHash('sha256').update(verificationCode).digest('hex');

  // Set token and expiration (e.g., 10 minutes)
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send email with verification code
  const message = `You requested a password reset. Use this verification code to reset your password: ${verificationCode}\n\nThis code expires in 10 minutes.`;
  try {
    await sendEmail(user.email, 'Password Reset Verification Code', message);
    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (error) {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.status(500);
    throw new Error('Error sending verification code');
  }
});

//@desc: Verify Code and Reset Password
//@api: POST /api/users/reset-password
//@method: public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, verificationCode, newPassword, confirmPassword } = req.body;

  if (!email || !verificationCode || !newPassword || !confirmPassword) {
    res.status(400);
    throw new Error('All fields are required');
  }

  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  const normalizedEmail = email.toLowerCase();
  const resetToken = crypto.createHash('sha256').update(verificationCode).digest('hex');

  const user = await Users.findOne({
    email: normalizedEmail,
    resetPasswordToken: resetToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  // Update password
  user.password = newPassword; // The pre-save hook will hash it
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.status(200).json({ message: 'Password reset successfully' });
});


//@desc: Change Password
//@api: POST /api/users/change-password
//@method: private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  console.log("changePassword called:", { userId: req.user?._id, newPasswordLength: newPassword?.length });

  // Check if user is authenticated
  if (!req.user) {
    console.log("No user in request");
    res.status(401);
    throw new Error("Not authorized, no user found in request");
  }

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400);
    throw new Error("Please provide current password, new password, and confirmation password");
  }

  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("New password and confirmation password do not match");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  // Check if user has a password
  if (!req.user.password) {
    console.log("User password not found in database");
    res.status(500);
    throw new Error("Server error: User password not found");
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, req.user.password);
  if (!isMatch) {
    res.status(400);
    console.log("Setting status 400 for incorrect password");
    throw new Error("Current password is incorrect");
  }

  // Check if new password is the same as current password
  const isSamePassword = await bcrypt.compare(newPassword, req.user.password);
  if (isSamePassword) {
    res.status(400);
    throw new Error("New password cannot be the same as the current password");
  }

  // Hash new password
  try {
    const salt = await bcrypt.genSalt(10);
    req.user.password = await bcrypt.hash(newPassword, salt);
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500);
    throw new Error("Server error: Failed to hash password");
  }

  // Save updated user
  try {
    await req.user.save();
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500);
    throw new Error("Server error: Failed to save user");
  }

  res.status(200).json({ message: "Password changed successfully" });
});

// @desc    Toggle follow/unfollow a user
// @route   POST /api/users/:id/follow
// @access  Private
const toggleFollow = asyncHandler(async (req, res) => {
  const userId = req.params.id; // User to follow/unfollow
  const currentUserId = req.user.id; // Current user from verifyToken

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error('Invalid user ID');
  }

  if (userId === currentUserId) {
    res.status(400);
    throw new Error('You cannot follow yourself');
  }

  const userToFollow = await Users.findById(userId);
  if (!userToFollow) {
    res.status(404);
    throw new Error('User not found');
  }

  const currentUser = await Users.findById(currentUserId);
  if (!currentUser) {
    res.status(404);
    throw new Error('Current user not found');
  }

  const isFollowing = userToFollow.followers.includes(currentUserId);
  if (isFollowing) {
    // Unfollow: Remove currentUserId from userToFollow's followers
    userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUserId);
    await userToFollow.save();
  } else {
    // Follow: Add currentUserId to userToFollow's followers
    userToFollow.followers.push(currentUserId);
    await userToFollow.save();
  }

  res.status(200).json({
    message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
    isFollowing: !isFollowing,
  });
});


module.exports = {
  getUsers,
  createUser,
  loginUser,
  currentUser,
  verifyLoginToken,
  updateProfile,
  uploadProfilePicture,
  getUserById,
  getHomeUsers,
  getHomeUserById,
  checkUsername,
  getUserIdByUsername,
  forgotPassword, 
  toggleFollow,
  resetPassword,
  setGeographicLocation, // New
  getLocationBasedRecommendations, // Updated
  getCurrentUserGeolocation, // New
  changePassword,
  getEmails,
};
