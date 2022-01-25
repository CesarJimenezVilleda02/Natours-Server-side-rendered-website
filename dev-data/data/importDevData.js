const dotenv = require('dotenv');
const fs = require('fs');
const mongoose = require('mongoose');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

// va a hacer que lea del archivo y las guarde en las variables de entorno
dotenv.config({ path: '../../config.env' });

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
    });

// read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
    fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// import data into database
const importData = async () => {
    try {
        // el create puede aceptar un arreglo de objetos
        await Tour.create(tours, { validateBeforeSave: false });
        await User.create(users, { validateBeforeSave: false });
        await Review.create(reviews, { validateBeforeSave: false });
        console.log('Data successfully uploded');
        process.exit();
    } catch (error) {
        console.log(error);
    }
};

// delete all data from Collection
const deleteData = async () => {
    try {
        // si le pasamos un objeto de filtro vacio borra todo
        await Tour.deleteMany({});
        await User.deleteMany({});
        await Review.deleteMany({});
        console.log('Data successfully deleted');
        process.exit();
    } catch (error) {
        console.log(error);
    }
};

// cuando lo corres en consola llegan todos los argumentos aqui
console.log(process.argv);

if (process.argv[2] === '---import') {
    importData();
} else if (process.argv[2] === '---delete') {
    deleteData();
}
