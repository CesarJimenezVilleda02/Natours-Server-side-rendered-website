const express = require('express');

const router = express.Router();

// RUTAS
const {
    uploadUserPhoto,
    resizeUserPhoto,
    getAllUsers,
    updateMe,
    deleteMe,
    getMe,
    createUser,
    getUser,
    updateUser,
    deleteUser,
} = require(`${__dirname}/../controllers/userController.js`);
// AUTENTICACION
const {
    protect,
    restrictTo,
    signUp,
    login,
    logout,
    forgotPassword,
    resetPassword,
    updatePassword,
} = require(`${__dirname}/../controllers/authenticationController.js`);

router.post('/signup', signUp);
router.post('/login', login);

router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

// como todas las que vienen a continuacion deben ser protegidas agregamos un middleware que se va a usar siempre
// porque recordemos que los middlewares se ejecutan en secuencia
router.use(protect); //protect all routes after this middlewares

router.get('/me', getMe, getUser);
router.get('/logout', logout);
router.patch('/updateMyPassword', updatePassword);
router.patch('/updateMe', uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete('/deleteMe', deleteMe);

// RUTAS SOLO PARA ADMINISTRADORES
router.use(restrictTo('admin')); //a partir de aqui todas estan protegidas y restringidas

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
