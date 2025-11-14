const express = require('express');
const { 
  getUsers, 
  createUser, 
  loginUser, 
  currentUser, 
  verifyLoginToken, 
  uploadProfilePicture, 
  updateProfile, 
  getUserById, 
  getHomeUsers, 
  getHomeUserById, 
  checkUsername,
  getUserIdByUsername,
  toggleFollow,
  forgotPassword,
  resetPassword,
  changePassword,
  setGeographicLocation,
  getLocationBasedRecommendations,
  getCurrentUserGeolocation
} = require('../controllers/userController');
const verifyToken = require('../middleware/verifyTokenHandler');
const upload = require('../config/multer');  
const router = express.Router();

// Public routes
router.route('/register')
  .post(createUser);

router.route('/login')
  .post(loginUser);

router.route('/forgot-password')
  .post(forgotPassword);

router.route('/reset-password')
  .post(resetPassword);

router.route('/username/:username')
  .get(getUserIdByUsername);

router.route('/upload-profile')
  .post(verifyToken, upload.single('profile'), uploadProfilePicture);
// Protected routes (require authentication)
router.route('/')
  .get(verifyToken, getUsers);

router.route('/home')
  .get(verifyToken, getHomeUsers);

router.route('/home/:id')
  .get(verifyToken, getHomeUserById);

router.route('/current')
  .get(verifyToken, currentUser)
  .put(verifyToken, updateProfile);

router.route('/verify-token')
  .get(verifyToken, verifyLoginToken);


router.route("/check-username")
  .post(verifyToken, checkUsername);

router.route('/:id')
  .get(verifyToken, getUserById);

router.route('/:id/follow')
  .post(verifyToken, toggleFollow);


// Password management
router.post('/change-password', verifyToken, changePassword);

// New Geographic Location Routes
router.route('/set-location')
  .post(verifyToken, setGeographicLocation);

router.route('/current/geolocation')
  .get(verifyToken, getCurrentUserGeolocation);

router.route('/recommendations/location')
  .get(verifyToken, getLocationBasedRecommendations);

module.exports = router;