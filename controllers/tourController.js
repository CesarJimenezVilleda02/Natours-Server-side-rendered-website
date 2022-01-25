const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const APIFeatures = require(`${__dirname}/../utils/APIFeatures`);

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(
            new AppError('Not an image, please upload only images.', 404),
            false
        );
    }
};

const upload = multer({ storage: multerStorage, filter: multerFilter });

// este se usa para cuando tienes varios diferentes
exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Cover image
    // el updateOne va a agarrar todo el body
    //imageCover es el nombre del schema
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // 2) Images
    req.body.images = [];

    // con un async await no podemos ponerlo dentro de un for each oorque no se espera
    // para que se espere y si se corran e paralelo debemos usar Promise.all()
    // el cual se va a esperar a que las promesas en un arreglo se resuelvan, por eso es
    // con maop porque cada una regresa una promesa
    await Promise.all(
        // el map nos va a regresar un arreglo de funciones asincronas que regresan promesas
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${
                i + 1
            }.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);

            // como el update one agarra el body va a actulizar el tour con el nuevo arreglo
            req.body.images.push(filename);
        })
    );

    next();
});

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);
// el path es el campo que queremos populado
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// la aggregation pipeline es algo que solo esta en mongodb
// pero el mongoose nos da acceso a esta feature
exports.getTourStats = catchAsync(async (req, res) => {
    // uar la aggregation pipeline es como usar una query regular
    // la diferencia es que con las aggregation manipulamos los datos
    // por pasos, cada paso es una entrada en el arreglo que recibe de argumento
    const stats = await Tour.aggregate([
        {
            $match: {
                // dentro del match va u objeto de filtro
                ratingsAverage: {
                    $gte: 4.5,
                },
            },
        },
        {
            // nos permite agrupar grupos usando acumuladores
            $group: {
                // con el null le decimos que agrupe a todos
                // _id: null,
                // con esto se nos agrupan las estadisticas por cada grupo
                // definido por la propiedad de dificultad
                _id: {
                    $toUpper: '$difficulty',
                },
                // por cada documento que pase por este pipeline se le suma 1 al contador
                numTours: {
                    $sum: 1,
                },
                numRatings: {
                    $sum: '$ratingsQuantity',
                },
                // nombramos la propiedad que queremos de regreso y dentro como
                // calcularla
                avgRating: {
                    // va el atributo al que se le saca con un $ antes
                    $avg: '$ratingsAverage',
                },
                avgPrice: {
                    $avg: '$price',
                },
                minPrice: {
                    $min: '$price',
                },
                maxPrice: {
                    $max: '$price',
                },
            },
        },
        {
            // en el anterior ya generamos documentos, el sort se va a aplicar a esos documentos
            $sort: {
                // usamoa los atributos del anterior y un 1 para decirle que ese
                avgRating: 1,
            },
        },
        // {
        //     // podemos repetir stages
        //     $match: {
        //         _id: {
        //             // not equal
        //             $ne: 'EASY',
        //         },
        //     },
        // },
    ]);
    // aggregate nos da un aggregate objet solo hasta que lo awaiteamos nos da las estadisticas

    res.status(200).json({
        status: 'success',
        data: {
            stats,
        },
    });
});

// queremos que esto salga por año
exports.getMonthlyPlan = catchAsync(async (req, res) => {
    const year = req.params.year * 1;

    // recordemos que cada tour tiene las fechas en las que inicia
    // queremos contar los tours que hay en cada mes del año
    const plan = await Tour.aggregate([
        // este stage clona documentos y elimina arreglos
        {
            // nos hace un documento las veces que salga un elemento en ese campo, en vez de 9 tenemos 27
            $unwind: '$startDates',
        },
        {
            $match: {
                // queremos que la fecha sea mayor a primero de enero del año que le pedimos y menor al que sigue
                startDates: {
                    // el formato es year month date
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                    // con esto solo debería haber tours del 2021
                },
            },
        },
        {
            $group: {
                // queremos agruparlos por mes pero ahorita los tenemos completos
                _id: {
                    // el nombre del field del que saldrá el mes
                    // month saca el mes de una fecha
                    $month: '$startDates',
                },
                // recordemos que por cada documento se hacen los siguientes
                numTours: {
                    // sumamos 1 por cada uno agrupado
                    $sum: 1,
                },
                // para un array ecesitamos un push
                tours: {
                    // con el push asi solo mandamos un campo
                    // $push: '$name'
                    $push: {
                        name: '$name',
                        start: '$startDates',
                    },
                },
            },
        },
        {
            $addFields: {
                // con este agregamos un campo que es el mes y hace referencia al num
                month: '$_id',
            },
        },
        {
            // con 1 si aparece con 0 ya no
            $project: {
                _id: 0,
            },
        },
        {
            $sort: {
                // 1 es ascendente -1 es descendiente
                numTours: -1,
            },
        },
        {
            $limit: 12,
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats,
        },
    });
});

// router.route(
//     '/tours-within/:distance/center/:latlng/unit/:unit',
//     getToursWithin
// );
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
        return next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng',
                400
            )
        );
    }
    // es dividir el radio entre la curvatura de la tierra
    const radious = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    const tours = await Tour.find({
        // encuentra documentos dentro de una geometria
        startLocation: {
            $geoWithin: {
                // este recibe un arreglo de las coordenadas
                $centerSphere: [[lng, lat], radious],
                // en el primer arreglo es lng, lat en orden, el segundo es un radio en radianes que es la unidad especial
            },
        },
    });

    // para que todo funcione debemos crear un nuevo indice
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours,
        },
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
        return next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng',
                400
            )
        );
    }
    // para la agregacion geoespacial solo hay una fase -- geonear siempre tiene que ser el primero en
    // la pipeline
    const distances = await Tour.aggregate([
        {
            $geoNear: {
                // este tambien necesitaria el index, geoNear usa este por defecto
                // near es el punto desde donde calcular las distancias
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1],
                },
                // el valor es el nombre dle campo donde se va a calcular
                distanceField: 'distance',
                // ya que se tiene la distancia se multiplica por esto
                distanceMultiplier: unit === 'mi' ? 0.00062137 : 0.001,
            },
        },
        {
            $project: {
                distance: 1,
                name: 1,
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        results: distances.length,
        data: {
            data: distances,
        },
    });
});
