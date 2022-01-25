import axios from 'axios';
import { showAlert } from './alerts';

// aqui es donde usaremos la llave publica
export const bookTour = async (tourId) => {
    try {
        // nuevamente vamos a necesitar de un nuevo script que le vamos a anadir al tour
        // Stripe se obtiene de incluir el archivo
        const stripe = Stripe(
            'pk_test_51HiFIVFvjKAeBp1I8CDBmWjZ6tS9vh2gE3qxcQ4dwIgsP6iVbeEZDxCupThkRYivlLFxzX8jNt3Gk08qW45MAgkt00O6qIodne'
        );

        // 1 get the checkout session from the server --- endpoint
        const session = await axios(
            `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
        );

        // 2 use the stripe object to create the checkout form and charge the credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id,
        });
    } catch (e) {
        showAlert('Payment could not be processed! Plase try again later.');
    }
};
