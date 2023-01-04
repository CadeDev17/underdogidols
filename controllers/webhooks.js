const stripe = require('stripe')
const endpointSecret = "whsec_ef3f75837fd0a0e0999e365496e753878587a5e1cc5aa48d1f1bcae062695440";

const User = require('../models/user')

exports.handleWebhooks = (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;
    let customerEmail;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handles the event
    switch (event.type) {
        case 'charge.succeeded':
            const chargeSucceeded = event.data.object;
            handleSuccessfulPayments(chargeSucceeded)
            break;
    }
    
    response.send();
}

const handleSuccessfulPayments = (chargeSucceeded) => {
    let email = chargeSucceeded.billing_details.email
    let amountCaptured = chargeSucceeded.amount_captured
    User.find({ email: email })
        .then(user => {
            switch (amountCaptured) {
                case 9900:
                    user[0].isPremiumUser = true
                    break;

                case 7500:
                    user[0].isGoldAd = true
                    break;

                case 4500:
                    user[0].isSilverAd = true
                    break;

                case 1500:
                    user[0].isBronzeAd = true
                    break
            }
            user[0].save()
        })
}