const mongoose = require('mongoose');

// review - rating - createdAt - ref to tour - ref to user

// PARA LAS REFERENCIAS:
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: true,
            trim: true,
        },
        rating: {
            type: Number,
            required: true,
            min: [1, 'Rating must be above 1'],
            max: [5, 'Rating must be below 5'],
        },
        createdAt: {
            type: Date,
            // en el default tambien se puede poner una funcion que se va a llamar
            // default: Date.now,
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must be written by an author'],
        },
    },
    {
        toJSON: {
            virtuals: true,
        },
        toObject: {
            virtuals: true,
        },
    }
);

// con este index al agregar un unique en las opciones nos permite decirle que la combinacion sea unica
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// DOCUMENT MIDDLEWARES
reviewSchema.pre('save', function (next) {
    this.createdAt = Date.now();
    next();
});

// Query MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo',
    });
    next();
});

// STATIC METHODS
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // para hacer el calculo usaremos la aggregation pipeline que nos ayuda a crear estadisticas
    // en el metodo de instancia el this apunta al modelo
    const stats = await this.aggregate([
        {
            // primero que solo nos salgan las reviews de este tour
            $match: {
                tour: tourId,
            },
        },
        {
            // segundo agrupamos por id - uno por cada grupo
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ]);
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            // por el group se guardan en arreglo
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            // por el group se guardan en arreglo
            ratingsQuantity: 0,
            ratingsAverage: 4.5,
        });
    }
};

// el problema es que no tenemos acceso al modelo porque aun estamos en el schema y no lo hemos definido
reviewSchema.post('save', function () {
    //debe ser post para que se guarde el doc y se tome en cuenta para el promedio
    // this points to current document to save
    this.constructor.calcAverageRatings(this.tour); //this.constructor apunta al modelo que creo el doc
});

// ANTES DE QUE SE PERSISTA TODO
reviewSchema.pre(/^findOneAnd/, async function (next) {
    // la meta es acceder a la review actual, con el this accedemos al documento que esta siendo buscado
    this.r = await this.findOne();
    next();
});
// para pasarle el tour id para que se puede recalcular el avg
// DESPUES DE QUE SE PERSISTIO
reviewSchema.post(/^findOneAnd/, async function () {
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
