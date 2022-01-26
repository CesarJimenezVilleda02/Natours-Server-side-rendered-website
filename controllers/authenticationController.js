const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const Email = require('./../utils/email');
const AppError = require('./../utils/appError');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000
        ),
        httpOnly: true,
        secure: req.secure || req.headders('x-forwarded-proto') === 'https',
    };

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signUp = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    // no queremos harcodear la url
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    return createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // con estos vamos a checar
    // 1 checar si email y password existen
    if (!email || !password) {
        // despues de llamar el next queremos que esta funcion termine
        return next(new AppError('Please provide email and password', 400));
    }

    // 2 checar si existe un usuario y si son correctas
    const user = await User.findOne({ email }).select('+password'); //con el plus antes dle nombre agarramos los que tienen select false
    // ya con esto lo tenemos hasheado pero debemos compararla con la original, esto va en el model porque s erefiere al negocio
    // const correct = await user.correctPassword(password, user.password); //esta es una funcion de instancia, por eso esta en el resultado

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    } // si hasta aqui no ha mandado alv ps ya llegamos a lo bueno

    // 3 enviar la JWT de regreso al cliente
    createSendToken(user, 201, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting the token and check if its there
    // Normalmente se manda el token un header en la request. En express se usa req.headers para acceder a los headers
    let token;
    if (
        // es un estandard que el token vaya con este header y con el Bearer antes
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // console.log('Token used: ', token);

    if (!token) {
        return next(
            new AppError(
                'You are not logged in. Please log in to get access',
                401
            ) //401 es no autorizado
        );
    }
    // 2) Verification: Validate the token to view if the signature is valid
    // verificamos si ya expiro o si se ha modificado el token, si esto pasa manda error que ya atrapamos
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); //vamos a promisificar esta funcion usando la libreria util de node
    // console.log(decoded); // esto va aser el payload de la token que trae el id

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
        return next(new AppError('The user does not longer exists', 401));
    }

    // 4) Check if user changed passwords after the token was issued
    // PARA ESTE CREAREMOS UN nuevo metodo de INSTANCIA
    if (user.changedPasswordAfter(decoded.iat)) {
        // iat - issued at
        return next(
            new AppError(
                'User recently changed password! Please login again',
                401
            )
        );
    }
    // 5) Next is called and the req accesses the protected route
    req.user = user; //podria ser util
    res.locals.user = user; // para poder usarlo en todas las rutas
    next();
});

// ...roles nos genera un arreglo
exports.restrictTo = (...roles) => {
    // por closures recuerda las variables anteriores
    return (req, res, next) => {
        // si no incluye el rol mandamos error para que lo atrape el error handler
        if (!roles.includes(req.user.role)) {
            next(
                new AppError(
                    'You do not have permission to perform this action.',
                    403
                )
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1 get user based on posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
            new AppError('There is no user with that email address', 404)
        );
    }
    // 2 generate random token
    // como son varias cosas para generar la token mejor lo hacemos con mongoose
    const resetToken = user.createPasswordResetToken();
    // solo modificamos el documento, para guardarlo usamos el save()
    await user.save({ validateBeforeSave: false }); //necesitamos que no corran todos los validadores para solo guardar las nuevas

    // 3 send it back as an email
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/resetpassword/${resetToken}`;

    // si falla queremos eliminar la token
    try {
        await new Email(user, resetURL).sendPasswordReset();
    } catch (err) {
        user.createPasswordResetToken = undefined;
        user.createPasswordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(
            new AppError(
                'There was an error sending the email. Try again later.',
                500
            )
        );
    }

    res.status(200).json({
        status: 'success',
        message: 'Token sent to email',
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1 get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
    // encontrara el usuario con el token que coincida y con la fecha de expiracion no expirada
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gte: Date.now() },
    });

    // 2 if token has not expired and there is user set new password
    if (!user)
        return next(
            new AppError('Invalid token used to reset the password.', 400)
        );
    // 3 update changedPasswordAt property for the user
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // es importante usar el save para tener los validadores del password
    await user.save({ validateBeforeSave: false });

    // 4 log the user in and send jwt
    createSendToken(user, 200, req, res);
});

// vamos anecesitar que el user vuelva a pasar su password
exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1 get user
    const user = await User.findById(req.user._id).select('+password');

    // 2 check if posted password is correct
    if (
        !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
        return next(new AppError('Your current password is incorrect.', 401));
    }
    // 3 if so, update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // 4 log the user in sending JWT
    createSendToken(user, 200, req, res);
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // 3) Check if user changed password after the token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.logout = (req, res, next) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        // httpOnly: true,
    });
    res.status(200).json({ status: 'success' });
};
