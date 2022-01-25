// el require nos devuelve una funcion a la que le pasamos la llave
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const APIFeatures = require(`${__dirname}/../utils/APIFeatures`);

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    // Create checkout session
    // npm i stripe
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        // esta es la url a la que redirigira el usuario cuando se complete la compra
        // con la query string y los rags crearemos el nuevo booking
        success_url: `${req.protocol}://${req.get('host')}/?tour=${
            req.params.tourId
        }&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        // se prellena el campo
        customer_email: req.user.email,
        // esto es para que luego podemos acceder a la orden y cambiar los bookings
        client_reference_id: req.params.tourId,
        line_items: [
            {
                // todos estos campos vienen de stripe
                name: tour.name,
                description: tour.summary,
                // estas imagenes deben de ser live images, ahora vamos ausar unas d placeholder
                images: [
                    `https://www.natours.dev/img/tours/${tour.imageCover}`,
                ],
                // luego sigue el precio que se va cobrar la cual se espera en centavos
                amount: tour.price * 100,
                currency: 'usd',
                quantity: 1,
            },
        ],
    });

    // Create session as response
    res.status(200).json({
        status: 'success',
        session,
    });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
    const { tour, user, price } = req.query;

    // queremos que despues de hacer el booking se mande a una middleware function si no sale
    if (!tour && !user && !price) return next();
    await Booking.create({ tour, user, price });

    // cuandp ya quede lo mandamos al url original, es lo mismo que next() pero regresas al inicio del stack
    res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
