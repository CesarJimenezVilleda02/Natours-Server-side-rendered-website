const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!'],
    },
    email: {
        type: String,
        required: [true, 'Please give us your email!'],
        lowercase: true,
        unique: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
        type: String,
        default: 'default.jpg',
    },
    role: {
        type: String,
        default: 'user',
        enum: {
            values: ['user', 'guide', 'lead-guide', 'admin'],
            message: 'The role selected is not permitted',
        },
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        // con el select no vuelve a aparecer
        minlength: [8, 'A password must have at least 8 characters'],
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your pssword'],
        validate: {
            // queremos contraseñas iguales
            validator: function (value) {
                return value === this.password;
            },
            message: 'Please enter the same password you entered prevoiusly',
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

// LA VALIDACION PASA ANTES DEL SAVE - EL REQUIRED ES UN INPUT NECESARIO PERO QUE NO A FUERZA DEBE SER PERSISTIDO
// pasa entre que llegan los datos y se persiste
userSchema.pre('save', async function (next) {
    // solo queremos actualizarlo cuando se ha actualizado o creado la contraseña
    // recordemos que el this es el documento actual
    if (this.isModified('password')) {
        //preguntamos si la contraseña ha sido modificada, si si la vamos a hashear
        // usaremos un algoritmo de encriptamiento llamado bcrypt.
        this.password = await bcrypt.hash(this.password, 12); // al lado le pasamos un numero que define lo pesado que sera el encriptamiento
        // no queremos bloquear el codigo, por eso la hacemos asincronica
        this.passwordConfirm = undefined;
        // poniendolo como undefined elimina el campo y no lo guarda el mongoose
    }
    return next();
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    else {
        // esto nos asegura que la token ha sido creada despues de que se ha cambiado
        this.passwordChangedAt = Date.now() - 1000;
        next();
    }
});

// INSTANCE METHODS
// va a estar disponible en todos los lugares de una coleccion
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    // el this va a corresponder al documento pero como tenemos la password con el select false a esa no tenemos acceso
    return await bcrypt.compare(candidatePassword, userPassword); // la va a comparar, la primera es sin hash y la segunda con hash
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    // para esto necesitamos un campo para cuando se cambia la contraseña
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    // false es que no se cambio
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    // deberia de ser una cadena aleatoria, para esto usaremos el built-in crypto module
    const resetToken = crypto.randomBytes(32).toString('hex'); //ingresamos bytes y luego le decimos que lo pase a hexadecimal
    // para guardarla en la base de datos deberian de ir encriptadas

    // eso se va a guardar en la base de datos
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // debemos mandar la reset token desencriptada al usuario
    return resetToken;
};

// QUERY MIDDLEWARES
userSchema.pre(/^find/, function (next) {
    this.find({
        active: { $ne: false },
    });

    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
