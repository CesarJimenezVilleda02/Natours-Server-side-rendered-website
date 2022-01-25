// COMO ESTAS FUNCIONES BASICAMENTE VAN A REGRESAR CONTROLADORES PONDREMOS AQUI LAS FABRICAS
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const APIFeatures = require(`./../utils/apiFeatures`);

// esta es la generalizacion, esta va a funcionar para cada modelo
exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
            // ESTE ES SOLO PARA IDS QUE TENGAN FORMATO VALIDO
            const error = new AppError('No document found with that ID', 404);
            return next(error);
        }

        res.status(204).json({
            status: 'success',
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            // con esta opcion le decimos que nos regrese el nuevo
            new: true,
            // con este se revisa denuevo la schema para ver si es válido
            runValidators: true,
        });

        if (!doc) {
            // ESTE ES SOLO PARA IDS QUE TENGAN FORMATO VALIDO
            const error = new AppError('No document found with that ID', 404);
            return next(error);
        }

        res.status(200).json({
            status: 'success',
            data: { data: doc },
        });
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const document = await Model.create(req.body);

        res.status(201).json({
            status: 'success',
            data: {
                tour: document,
            },
        });
    });

// el problema es que en este tenemos un populate en algunos
exports.getOne = (Model, popOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        // solo si hay opciones de populate esperamos a popular la respuesta
        if (popOptions) {
            query.populate(popOptions);
        }
        const document = await query;

        if (!document) {
            // ESTE ES SOLO PARA IDS QUE TENGAN FORMATO VALIDO
            const error = new AppError('No document found with that ID', 404);
            return next(error);
        }

        res.status(200).json({
            status: 'success',
            data: {
                document,
            },
        });
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res) => {
        // para permitir obtenerlos nesteados en el get de reviews de tour
        let filter = {};
        // pasamos un objeto de filter para solo obtener las reviews de un tour
        if (req.params.tourId) filter.tour = req.params.tourId;

        const features = new APIFeatures(Model.find(filter), req.query)
            // le pasamos el objeto del query de la url
            .filter()
            .sort()
            .limitFields()
            .paginate();
        // la query que hemos modificado ahora vive dentro de features
        const documents = await features.query;

        // SEND RESPONSE
        res.status(200).json({
            status: 'success',
            results: documents.length,
            data: { documents },
        });
    });
