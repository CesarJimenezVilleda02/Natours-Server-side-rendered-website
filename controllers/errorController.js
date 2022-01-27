const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message,
        });
    }
    console.log(err);
};
const sendErrorProduction = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        // Operational
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
            // Programming error
        } else {
            // 1 log error
            console.error('Error', err);

            // 2 send generic response
            res.status(500).json({
                status: 'error',
                error: 'Something went very wrong',
            });
        }
    } else {
        // Operational
        if (err.isOperational) {
            return res.status(err.statusCode).render('error', {
                title: 'Something went wrong',
                msg: err.message,
            });
            // Programming error
        } else {
            // 1 log error
            console.error('Error', err);

            // 2 send generic response
            return res.status(500).render('error', {
                title: 'Something went wrong',
                msg: 'Please try agein!',
            });
        }
    }
};

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    // 400 es bad request
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    // para sacarlo tenemos que usar una regular expression porque viene en un mensaje de mongo
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/); // nos matchea todos
    const message = `Duplicate field value: ${value[0]}. Plase use another value`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    // como el mongoose nos da un arreglo de errores de validacion debemos loopear
    const errors = Object.values(err.errors).map((err) => err.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return new AppError(message, 400);
};

// este es para tokens modificadas
const handleJWTError = (err) =>
    new AppError('Invalid token. Please login again.', 401);

const handleJWTExpiredError = (err) =>
    new AppError('Your session has expired. Please login again.', 401);

// si le damos 4 va a reconocer solo que estamos definiendo un middleware para errores que solo se va a llamar cuando haya
// errores
module.exports = (err, req, res, next) => {
    console.log(err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        // con esto identificaremos los errores de validacion
        let error = Object.create(err);
        // con el create obtenemos hasta al padre en una copia
        if (err.name === 'CastError') error = handleCastErrorDB(err);
        if (err.code === 11000) error = handleDuplicateFieldsDB(err);
        if (err.name === 'ValidationError')
            error = handleValidationErrorDB(err);
        if (err.name === 'JsonWebTokenError') error = handleJWTError(err);
        if (err.name === 'TokenExpiredError')
            error = handleJWTExpiredError(err);
        sendErrorProduction(error, req, res);
    }
};
