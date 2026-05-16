const express = require('express')
const router = express.Router()
const planController = require('../controllers/plan')
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, planController.getPlan)

router.post('/addPerson', ensureAuth, planController.addPerson)

router.delete('/deletePerson', ensureAuth, planController.deletePerson)

router.post('/createdPlan', ensureAuth, planController.createdPlan)

module.exports = router
