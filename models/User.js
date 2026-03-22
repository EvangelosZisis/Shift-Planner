const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { required } = require('nodemon/lib/config')

const UserSchema = new mongoose.Schema({
  userName: {type: String, unique: true, sparse: true},
  email: {type: String, unique: true, sparse: true},
  password: {type: String,  sparse: true},
  googleId: {type: String, unique: true, sparse: true},
  displayName: {type: String},
  firstName: {type: String},
  lastName: {type: String},
  image: {type: String},
  createdAt: {type: Date, default: Date.now}
})

// Password hash middleware.
 
 UserSchema.pre('save', function save(next) {
  const user = this
  if (!user.isModified('password')) { return next() }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err) }
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) { return next(err) }
      user.password = hash
      next()
    })
  })
})

// Helper method for validating user's password.

UserSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch)
  })
}

module.exports = mongoose.model('User', UserSchema)
