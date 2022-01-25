const express = require('express');

const router = express.Router();

const {
    protect,
    restrictTo,
} = require('../controllers/authenticationController');
const {
    getCheckoutSession,
    getAllBookings,
    createBooking,
    getBooking,
    updateBooking,
    deleteBooking,
} = require('../controllers/bookingController');

router.use(protect);

router.get('/checkout-session/:tourId', getCheckoutSession);

router.use(restrictTo('admin', 'lead-guide'));

router.route('/').get(getAllBookings).post(createBooking);

router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking);

module.exports = router;
