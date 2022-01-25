// La idea es que este archivo delegue todo a los otros
import '@babel/polyfill';
import { signup, login, logout } from './Login';
import { displayMap } from './mapbox';
import { updateData } from './updateSettings';
import { bookTour } from './stripe';

console.log('hello from parcel');

// DOM ELEMENTS
const mapbox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signUpForm = document.querySelector('.form--signup');
const userDataForm = document.querySelector('.form-user-data');
const passwordDataForm = document.querySelector('.form-user-password');
const logoutBtn = document.querySelector('.nav__el--logout');
const bookBtn = document.getElementById('book-tour');

// DELEGATIONS
if (mapbox) {
    const locations = JSON.parse(
        document.getElementById('map').dataset.locations
    );
    displayMap(locations);
}
if (loginForm)
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
if (signUpForm)
    signUpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm =
            document.getElementById('passwordConfirm').value;
        signup(name, email, password, passwordConfirm);
    });
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}
if (userDataForm) {
    userDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        // debemos crear una forma
        const form = new FormData();
        form.append('name', name);
        form.append('email', email);
        // estamos recreando una multipart form data
        form.append('photo', document.getElementById('photo').files[0]);

        // ajax va a reconocer la forma como objeto por lo que no tendremos que csmbiar nada
        updateData(form, 'data');
    });
}
if (passwordDataForm) {
    passwordDataForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword =
            document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const passwordConfirm =
            document.getElementById('password-confirm').value;
        document.querySelector('btn--save-password').value = 'Updating';

        await updateData(
            { currentPassword, password, passwordConfirm },
            'password'
        );
        document.querySelector('btn--save-password').value = 'Save password';
    });
}
if (bookBtn) {
    bookBtn.addEventListener('click', (e) => {
        // aunque sea tour-id el js nos lo pasa a camel case
        const { tourId } = e.target.dataset;
        e.target.textContent = 'Processing...';
        bookTour(tourId);
    });
}
