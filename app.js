const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');

// ROUTERS
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

// APP ERROR
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
// le tenemos que decir donde estan las views, debemos crear una carpeta view -> MVC
// const path = require('path'); //libreria ya incluida que nos permite generar paths
app.set('views', path.join(__dirname, 'views')); // -> ./views

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
// es como app.get()
app.options('*', cors());

// SERVING STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// GLOBAL MIDDLEWARES
// Las lecturas solo se leen una vez y se quedan en el process que está disponible
// en todos los archivos
// console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// SECURITY HEADERS
// este middleware nos da los headers de seguridad
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
            baseUri: ["'self'"],
            fontSrc: ["'self'", 'https:', 'http:', 'data:'],
            scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
            imgSrc: ["'self'", 'data:', 'blob:'],
        },
    })
);

// es una funcion que recibe un objeto de opciones del limite -- permitiremos 100 req de la misma ip en una hora
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    handler: function (req, res, next) {
        return next(
            new AppError(
                'You sent too many requests. Please wait a while then try again',
                429
            )
        );
    },
    // message: 'Too many requests from the same IP, please try again in an hour.',
    // skipSuccessfulRequests: true,
});
// con esto el limitador es una funcion
app.use('/api', limiter); //afectara todas las rutas que inicien con /api

// lo queremos antes dle body parser porque el body va a ser una string que no debe ser convertida a json
// lo tenemos que pasar a una raw form, para esto usamos un middleware de express
app.post(
    '/webhook-checkout',
    express.raw({ type: 'applicatio/json' }),
    bookingController.webhookCheckout
);

// BODY PARSER, reading from body into req.body
app.use(express.json({ limit: '10kb' })); // con esto le decimos que no se pase mas largo de este body
app.use(express.urlencoded({ extnded: true, limt: '10kb' })); // extended es para que nos permita hacer querys mas complejas
app.use(cookieParser());

// Defend against nossql injection
app.use(mongoSanitize()); //esto mira a los parametros y body removiendo los operadores

// Defending against xss - elimina codigo de html que no squieran injectar
app.use(xss()); //convertiremos todos los simbolos de html

// Para prevenir que nos metan varias veces un parametro -- parameter pollution -> limpia el query string
app.use(
    hpp({
        // arreglo de los duplicados permitidos
        whitelist: [
            'duration',
            'name',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    })
);

app.use(compression());

app.use((req, res, next) => {
    // console.log(req.cookies);
    next();
});

// ROUTES -> estos son en realidad middlewares
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// ERROR HANDLER FOR UNHANDLED ROUTES
// el asterizco dice que en cualquiera salte
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can´t find ${req.originalUrl} on this server`,
    // });
    // lo que le pasemos va a ser la propiedad de mensaje
    const error = new AppError(
        `Can´t find ${req.originalUrl} on this server`,
        404
    );

    // si al next le pasamos un argumento express va a asumir que pasó un error
    // esto aplica para cualquier middleware, se va a saltar todo el stacñ y se va directo al dle error
    next(error);
});
// le vamos a definir al lado los metodos , el all dice que en todos los metodos

// si le damos 4 va a reconocer solo que estamos definiendo un middleware para errores que solo se va a llamar cuando haya
// errores
app.use(globalErrorHandler);

module.exports = app;
