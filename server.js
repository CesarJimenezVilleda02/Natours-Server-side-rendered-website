const dotenv = require('dotenv');
const mongoose = require('mongoose');

// va a hacer que lea del archivo y las guarde en las variables de entorno
dotenv.config({ path: './config.env' });

// SE PONE ANTES DE TODO PARA QUE ATRAPE LO QUE VIENE DESPUES
// En este caso si hay que terminar el proceso porque la aplicacion de node entra un estado impuro
// cada vez que hay una unhandled exception se emite un objeto al que nos podemos suscribir
process.on('unhandledException', (err) => {
    console.log('UNHANDLED EXCEPTION!: SHUTTING DOWN');
    console.log(err.name, err.message);
    console.log(err);
    process.exit(1);
});

// nos conectamos el mongoose
// primero reemplazamos el password con nuestra contraseña
const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

// nos sirven para evitar depecrations, el segundo argumento son configuraciones
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
        // este metodo nos regresa una promesa
    })
    .then((con) => {
        console.log('Connection to DB successful');
    })
    .catch((err) => console.log('Connection to DB rejected', err));

const app = require(`${__dirname}/app.js`);

const port = process.env.PORT || 3000;

// app.listen nos regresa un objeto de
const server = app.listen(port, () => {
    console.log(`Server running on ${port}...`);
});

// cada vez que hay una unhandled rejection se emite un objeto al que nos podemos suscribir
process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    console.log('UNHANDLED REJECTION!: SHUTTING DOWN');
    // es una callback que se llama cuando el servidor termina de manejar todas sus req
    server.close(() => {
        process.exit(1);
    });
    // 1 es un codigo para unhandled rejection
});
// esta es una red que atrapara todas las promesas rechazadas no atrapadas

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down.');
    // no tenemos que usar el exit porque ya lo va a hacer el heroku
    // este metodo nos deja hacer que todas las respuestas pendientes se manejen antes de que termine
    server.close(() => {
        console.log('Process terminated.');
    });
});
