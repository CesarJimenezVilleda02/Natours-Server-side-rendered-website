const Tour = require('./../models/tourModel');
const Booking = require('../models/bookingModel');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
    // 1 get tour data from collection
    const tours = await Tour.find({});

    // 3 render template using data from step 1
    res.status(200).render('overview', {
        title: 'All tours',
        tours,
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user',
    });

    if (!tour) {
        return next(
            new AppError('The tour you are looking for does not exist.', 404)
        );
    }

    res.status(200)
        // necesitamos esto para que el mapbox nos deje pedir las cosas
        .set(
            'Content-Security-Policy',
            "default-src 'self' https://*.mapbox.com https://js.stripe.com/v3/;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://js.stripe.com/v3/ https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
        )
        .render('tour', {
            tour,
            title: tour.name,
        });
    // el segundo arg que le pasemos va a ser un objeto de variables a las que
    // podremos acceder en el pug
});

exports.getLoginForm = (req, res) => {
    res.status(200)
        .set(
            'Content-Security-Policy',
            "script-src 'self' https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js 'unsafe-inline' 'unsafe-eval';"
        )
        .render('login', {
            title: 'LOGIN',
        });
};
exports.getSignUpForm = (req, res) => {
    res.status(200)
        .set(
            'Content-Security-Policy',
            "script-src 'self' https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js 'unsafe-inline' 'unsafe-eval';"
        )
        .render('signup', {
            title: 'Sign Up',
        });
};

// ya no tenemos que hacer otro query para la cuenta porque ya nos lo da el protec
exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Account',
    });
};

exports.updateUserData = catchAsync(async (req, res) => {
    // recordemos que va a ir codificado el cambio en la url, el encoded va a venir en el body
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            // tienen estos nombres en el body porque fueron los que les dimos
            name: req.body.name,
            email: req.body.email,
            // u hacker podria hacer que cambie el rol por eso los especificamos
        },
        { new: true, runValidators: true }
    );
    // tenemos acceso al id porque el isloggedin nos lo va a dar

    res.status(200).render('account', {
        title: 'account',
        user: updatedUser,
        // tiene que se el nuevo porque el del protect va a estar desactualizado
    });
});

// la otra hubiese sido hacer un virtual populate al find para que llagaa con e tour
exports.getMyTours = catchAsync(async (req, res, next) => {
    // 1 find bookings
    const bookings = await Booking.find({ user: req.user.id });
    // tienen las tourids

    // 2 find tours with the returned ids
    const tourIds = bookings.map((booking) => booking.tour.id);
    // este operador va a buscar las ids que esten en el arreglo que le pasemos
    const tours = await Tour.find({ _id: { $in: tourIds } });

    // vamos a reusar la overview solo con los booked
    res.status(200).render('overview', {
        title: 'My tours',
        tours,
    });
});
