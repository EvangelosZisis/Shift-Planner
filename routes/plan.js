const express = require('express')
const router = express.Router()
const planController = require('../controllers/plan') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, planController.getPlan)

router.post('/addPerson', planController.addPerson)

router.put('/markComplete', planController.markComplete)

router.put('/markIncomplete', planController.markIncomplete)

router.delete('/deletePerson', planController.deletePerson)

router.post('/createdPlan', planController.createdPlan)

module.exports = router