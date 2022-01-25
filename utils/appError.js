class AppError extends Error {
    // el constructor se llama cada vez que se crea un objeto
    constructor(message, statusCode) {
        // para que herede es el super con el message
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // todos van a ser errores operacionales
        this.isOperational = true;
        // esto va a ser solo para mandar errores cuando no sean bugs o cosas de nuestro lado

        // TAMBIEN DEBEMOS GUARDAR EL STACK DE CADA ERROR, el cual nos dice donde sucedió en el codigo
        Error.captureStackTrace(this, this.constructor);
        // esto es para que al crear el error el constructor no salga en el stack trace
    }
}

module.exports = AppError;
