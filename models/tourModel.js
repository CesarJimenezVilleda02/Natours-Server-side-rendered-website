const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const User = require('./userModel');

// creamos nuestro schema
const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            // primero va si se requiere y luego el error en un arreglo
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            // VALIDATORS - SOLO DISPONIBLES EN STRINGS
            maxlength: [
                40,
                'A tour name must have less or equal than 40 characters',
            ],
            minlength: [10, 'A tour name must have at least 10 characters'],
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a gruoup size'],
        },
        difficulty: {
            // vamos a hacer que solo sean tres valores
            type: String,
            required: [true, 'A tour must have a difficulty'],
            // pasmoa arreglo de los valores permitidos
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message:
                    'Difficulty can only be either: easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            // si lo creamos sin rating
            default: 4.5,
            // VALIDATORS - tambien funcionan con fechas
            min: [1, 'Rating must be above 1'],
            max: [5, 'Rating must be below 5'],
            set: (val) => Math.round(val * 10) / 10,
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'Tour must have a price'],
        },
        priceDisccount: {
            type: Number,
            // para especificar el custom usamos validate
            // recordemos que necesitamos el acceso a la palabra this
            validate: {
                validator: function (value) {
                    // value es el descuento que puso el usuario
                    return value < this.price; //false hace un validation error
                },
                // el mensaje tiene acceso al valor, no es de js, es interno de mongoose
                message:
                    'Disccount price ({VALUE}) should be below the regular price',
            },
        },
        summary: {
            type: String,
            // trim solo funciona en strings, esta remueve todos los espacios al inicio y al final
            // del string para que "     jabdilaad   " no se vea así
            trim: true,
            required: [true, 'A tour must have a description'],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            // esto solo va a ser el nombre de la imagen porque guardaremos una imagen en el file system
            type: String,
            required: [true, 'A tour must have a cover image'],
        },
        // Para la coleccion de imagenes vamos a necesitar un arreglo de strings
        images: [String],
        // este debería ser un timestamp de cuando la crea el usuario
        createdAt: {
            // recordemos que Date es un tipo en JS
            type: Date,
            // este nos va a dar la fecha en milisegundo de ese momento
            default: Date.now(),
            // con el false ya no lo enseña
            select: false,
        },
        // fechas en las que inicia el tour en el año
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            // GeoJSON -- con esto especifica coordenadas. Este objeto no va a ser para el tipo, es su propio objeto
            type: {
                type: String,
                // podriamos tener pligonos
                default: 'Point',
                enum: ['Point'],
            },
            // estos son subcampos -> lat, lon
            coordinates: [Number],
            address: String,
            description: String,
            // para que se reconozca como embebido debe tener al menos dos campos
        },
        // como un arreglo de objetos ya nos deja
        locations: [
            {
                //a diferencia del que esta solo estos si son documentos y no objetos simples
                type: {
                    type: String,
                    // podriamos tener pligonos
                    default: 'Point',
                    enum: ['Point'],
                },
                // estos son subcampos -> lat, lon
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
                // para que se reconozca como embebido debe tener al menos dos campos
            },
        ],
        guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    },
    // OPTIONS
    {
        // cada vez que se mande en json queremos las virtuales
        toJSON: {
            virtuals: true,
        },
        toObject: {
            virtuals: true,
        },
    }
);

// 1 es ascendente y -1 es descendente
tourSchema.index({ price: 1 });
tourSchema.index({ ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); //con esto se ordenan por precio y rating
// basicamente con este index los dejamos ir para la mejor calidad - precio

// para la geoespacial -> debe ser un indice en 2D, como son puntos reales debe ser un 2Dsphere
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

tourSchema
    // primero el nombre de la propiedad virtual, luego opciones
    .virtual('reviews', {
        // en ref ponemos el nombre del modelo externo
        ref: 'Review',
        // aqui ponemos el nombre del campo de donde esta el id en el modelo externo
        foreignField: 'tour',
        // aqui ponemos e nombre del campo local que debe hacer match con el foraneo
        localField: '_id',
    });

// DOCUMENT MIDDLEWARE
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
    // Tenemos que definir el slug en el schema porque sino no persiste
});

// QUERY MIDDLEWARE
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
    // el pre es antes de que se aplique la query
    this.find({
        secretTour: { $ne: true },
    });
    this.start = Date.now();

    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        // recordemos que los - son para decir que campos no y que los + son para que nos lleguen los que estan con select false en el schema
        select: '-__v -passwordChangedAt',
    });

    next();
});

// este como es despues tiene acceso a los documentos
tourSchema.post(/^find/, function (doc, next) {
    // el post es despues del query
    console.log('Query took ', Date.now() - this.start, ' milliseconds');
    next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//     this.pipeline().unshift({
//         $match: {
//             secretTour: {
//                 $ne: true,
//             },
//         },
//     });
//     // recordemos que no importa tenerlas repetidas
//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
