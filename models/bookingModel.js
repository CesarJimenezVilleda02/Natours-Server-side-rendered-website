const mongoose = require('mongoose');

// para este vamos atener parent referencing
const bookingSchema = new mongoose.Schema({
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Booking must belong to a Tour!'],
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Booking must belong to a User!'],
    },
    price: {
        type: Number,
        require: [true, 'Booking must have a price.'],
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    // un usuario podriquerer agar en publico en una tienda o algo asi
    paid: {
        type: Boolean,
        default: true,
    },
});

bookingSchema.pre(/^find/, function (next) {
    // dos populates encadenados
    this.populate('user').populate({
        // path es el ccampo y select los atributos deseados
        path: 'tour',
        select: 'name',
    });
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
