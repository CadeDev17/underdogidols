const express = require('express')
const webhookController = require('../controllers/webhooks')

const router = express.Router()

router.post('/webhook', express.raw({type: 'application/json'}), webhookController.handleWebhooks)

module.exports = router;