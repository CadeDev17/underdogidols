require('dotenv').config()
const stripe = require('stripe')
const endpointSecret = process.env.STRIPE_WEBHOOK_ENDPOINTSECRET;

const User = require('../models/user')

exports.handleWebhooks = (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handles the event
    console.log(event)
    switch (event.type) {
        case 'charge.succeeded':
            const chargeSucceeded = event.data.object;
            handleSuccessfulPayments(chargeSucceeded)
            break;
        case 'customer.subscription.deleted':
            const subscriptionDeleted = event.data.object;
            handleDeletedSubscription(subscriptionDeleted)
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

                case 29500:
                    user[0].isGoldAd = true
                    break;

                case 19000:
                    user[0].isSilverAd = true
                    break;

                case 7500:
                    user[0].isBronzeAd = true
                    break
            }
            user[0].save()
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
}

const handleDeletedSubscription = (subscriptionDeleted) => {
    let email = chargeSucceeded.billing_details.email
    let amountCaptured = chargeSucceeded.amount_captured
    User.find({ email: email })
        .then(user => {
            if (user.userType === 'Contestant') {
                user.isPremiumUser = false
            }
            if (user.userType === 'Advertiser') {
                user.isBronzeAd = false
                user.isSilverAd = false
                user.isGoldAd = false
            }
            user[0].save()
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
}