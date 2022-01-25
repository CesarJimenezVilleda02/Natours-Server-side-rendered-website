const multer = require('multer');
const sharp = require('sharp');

const User = require('../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//     // cd es como el next de express
//     destination: (req, file, cb) => {
//         // el primer argumento del cb es un error
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         // user-user_id-timestamp.fileextension
//         // con esto nos aseguramos de que no haya imagenes con el mismo nombre
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     },
// });

// esto va a crear un buffer al que tendremos acceso en el req
const multerStorage = multer.memoryStorage();

// esta es basicamente para ver si la imagen es un archivo orque solo queremos permitir imagenes
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

// en ese folder es en donde queremos ir guardando todas las imagenes de los usuarios
// const upload = multer({ dest: 'public/img/users' });
const upload = multer({ storage: multerStorage, filter: multerFilter });
// con ek upload haremos un middleware para el updateMe

// este metodo va a solo la imagen con el nombre photo que va a ser el camp en la forma que lo va a estar subiendo
// esto va a agarrar al archivo y lo va a poner en donde especificamos y va a poner info en el req del archivo
exports.uploadUserPhoto = upload.single('photo');

// middleware qe nos va a permitir cambiar el tama;o de la imagen para que se asemeja mas al circulo
// en el stack va luego de que se haya manejado el upload con multer
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    // para cambiar el tamano usaremos el paquete sharp, es una libreria de procesamiento de imagenes
    // npm i sharp
    // es para no guardarlo y luego leerlo
    // el tercer arg serian opciones
    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        // con este se comprime
        .jpeg({ quality: 90 })
        // con este se guarda
        .toFile(`public/img/users/${req.file.filename}`); // le debemos pasar el archivo, nos devuelve un objeto al que le podemos encadenar metodos
    // para hacerlo debemos tenerlo en un buffer y no en el disco como hasta ahora

    next();
});

const filterObj = (obj, ...allowed) => {
    const newObj = {};
    filteredKeys = Object.keys(obj).map((key) => {
        if (allowed.includes(key)) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1 crear error si el usuario intenta actualizar su contraseña
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Plase use updateMyPassword.',
                400
            )
        );
    }
    // 2 update the user document
    // como hay campos necesarios usar save va a tener errores, porque no se actualizaria todo
    //no queremos dejar que actualice el role ej
    const filteredBody = filterObj(req.body, 'name', 'email');
    // recordemos que solo guardamos el nombre para que funcione
    if (req.file) filteredBody.photo = req.file.filename;
    const user = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        // queremos que regrese el viejo
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
    });
});

// el get me va a ser lo mismo que el get one
exports.getMe = (req, res, next) => {
    // si ponemos esta ruta antes del getOne, agregar el parametro nos va a dejar usa el getOne
    req.params.id = req.user.id;
    next();
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = factory.createOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
