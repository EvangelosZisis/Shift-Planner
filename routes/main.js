const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth') 
const homeController = require('../controllers/home')

router.get('/api/session', homeController.getSession)
router.post('/login', authController.postLogin)
router.get('/logout', authController.logout)
router.post('/signup', authController.postSignup)
router.get('/auth/google', authController.googleAuth)
router.get('/auth/google/callback', authController.googleAuthCallback)

module.exports = router
