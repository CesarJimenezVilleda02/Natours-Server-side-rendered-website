class APIFeatures {
    // el primero es el query del mongoose y el segundo el de la url
    constructor(query, queryString) {
        // queryString son los parametros
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludeFields = ['page', 'sort', 'limit', 'fields'];

        // quitamos los especiales que no le corresponden a este
        excludeFields.forEach((el) => delete queryObj[el]);

        // ADVANCED FILTERING
        let queryString = JSON.stringify(queryObj);
        queryString = queryString.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );
        // cada vez que encuentre coincidencia lo va a mandar asi

        this.query.find(JSON.parse(queryString));

        // para poderlo encadenar
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query.sort(sortBy);
        } else {
            // para que los mas nuevos nos salgan primero
            this.query.sort('-createdAt _id');
        }

        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query.select(fields);
        }
        this.query.select('-__v');

        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
