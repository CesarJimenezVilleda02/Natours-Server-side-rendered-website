const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// la idea es que siemre quese quiera crear un email solo se importe esta clase y a traves de ella se
// mande un correo, esta tendra un metodo quese llamara cada que un nuevo usuario se registre
module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `Pablo César Jiménez Villeda <${process.env.EMAIL_FROM}>`;
    }

    // MIENTRAS NO ESTEMOS EN PRODUCCION QUEREMOS USAR MAILTRAP
    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // Sendgrid
            return nodemailer.createTransport({
                host: process.env.EMAIL_PRODUCTION_HOST,
                port: process.env.EMAIL_PRODUCTION_PORT,
                auth: {
                    user: process.env.EMAIL_PRODUCTION_USER,
                    pass: process.env.EMAIL_PRODUCTION_PASS,
                },
            });
        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    // el metodo que va a hacer el sending, recibe el template y el sujeto
    async send(template, subject) {
        // render html based on pug template
        // tenemos que usar el paquete de pug
        const html = pug.renderFile(
            `${__dirname}/../views/emails/${template}.pug`,
            // como segunda opcion son los datos que populan el correo
            {
                firstName: this.firstName,
                url: this.url,
                subject,
            }
        );

        // define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            // para mandar una opcion de texto necesitamos un paquete
            // npm i html-to-text
            text: htmlToText.fromString(html),
        };

        //  create transport and send email
        //  await transporter.sendMail(mailOptions);
        await this.newTransport().sendMail(mailOptions);
        console.log('Email sent');
    }

    async sendWelcome() {
        // esto va a ser una pug template
        await this.send('welcome', 'Welcome to the natours family!');
    }

    async sendPasswordReset() {
        await this.send(
            'passwordReset',
            'Your password reset token (valid for only 10 minutes)'
        );
    }
};
