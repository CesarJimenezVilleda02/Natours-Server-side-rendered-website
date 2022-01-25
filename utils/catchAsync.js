// le vamos a pasar una funcion porque aui queremos atrapar el error
module.exports = (fn) => {
    // esta es la que express va a llamar porque la retorna y se guarda en el createTour
    return (req, res, next) => {
        // recordemos que las funciones asincronicas retornan promesas
        // fn(req, res, next).catch((err) => next(err));
        fn(req, res, next).catch(next);
        // como es asincrona para errores usamos el catch que lo va a pasar al next
        // para que este aparezca en el hanlder global
    };
};
