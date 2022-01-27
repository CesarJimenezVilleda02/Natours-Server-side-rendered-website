const express = require('express');

const {
    isLoggedIn,
    logout,
    protect,
} = require('./../controllers/authenticationController');
const {
    getOverview,
    getTour,
    getLoginForm,
    getSignUpForm,
    getAccount,
    getMyTours,
    updateUserData,
    alert,
} = require('./../controllers/viewsController');
const { createBookingCheckout } = require('./../controllers/bookingController');

const router = express.Router();

router.use(alert);

// queremos saber siempre si esta logueado, este le va a psar si el user
// esta logueado a las variables de las templates
router.use(isLoggedIn);

// Queremos evitar codigo duplicado, protect e islogged in hacen lo mismo
router.get('/me', protect, getAccount);
router.get('/my-tours', protect, getMyTours);
// si no trae params solo ensena la overview
// router.get('/', createBookingCheckout, getOverview);
router.get('/', getOverview);
router.get('/login', getLoginForm);
router.get('/signup', getSignUpForm);
router.get('/logout', logout);
router.get('/tour/:slug', getTour);

router.post('/submit-user-data', protect, updateUserData);

module.exports = router;
