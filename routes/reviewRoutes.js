const express = require('express');

// agregandole esta opcion nos llegan los params del anterior tambien
const router = express.Router({ mergeParams: true });
// por efecto un router solo tiene acceso a los parametros a partir de su ruta, con esta opcion los agregamos

const {
    protect,
    restrictTo,
} = require('../controllers/authenticationController');

const {
    getAllReviews,
    getReview,
    setTourUserIds,
    createReview,
    updateReview,
    deleteReview,
} = require('../controllers/reviewController');

// SOLO LOS AUTENTICADOS PUEDEN ACCEDER
router.use(protect);

router
    .route('/')
    .get(getAllReviews)
    .post(restrictTo('user'), setTourUserIds, createReview);

router
    .route('/:id')
    .get(getReview)
    .patch(restrictTo('user', 'admin'), updateReview)
    .delete(restrictTo('user', 'admin'), deleteReview);

module.exports = router;
