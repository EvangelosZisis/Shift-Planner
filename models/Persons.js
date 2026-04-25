const mongoose = require('mongoose')
const { use } = require('passport')

const PersonsSchema = new mongoose.Schema({
    personName: {type: String, 
    required: true
    },
    userId: {type: String,
    required: true
    },
    daysOfWork: {type: Number,
    required: true
    },
    availableDays: [Boolean], 
  
})

module.exports = mongoose.model('Persons', PersonsSchema)
