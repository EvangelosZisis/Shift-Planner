const Persons = require('../models/Persons')
const validator = require('validator')

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate()
const isWeekend = (day, month, year) => [0, 6].includes(new Date(year, month - 1, day).getDay())
const getPlanDaysCount = (month, year, includeOffDays) => {
    const daysInMonth = getDaysInMonth(month, year)

    if (includeOffDays) {
        return daysInMonth
    }

    let weekdays = 0
    for (let day = 1; day <= daysInMonth; day++) {
        if (!isWeekend(day, month, year)) {
            weekdays++
        }
    }

    return weekdays
}

const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
]



module.exports = {
    getPlan: async (req,res)=>{
        console.log(req.user)
        try{
            const personName = await Persons.find({userId:req.user.id})
            const today = new Date()
            const selectedMonth = today.getMonth() + 1
            const selectedYear = today.getFullYear()
            const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
            res.render('plan.ejs', {plan: personName, user: req.user, req: req, selectedMonth, selectedYear, daysInMonth, monthNames})
            
            
        }catch(err){
            console.log(err)
        }
    },
    
    addPerson: async (req, res)=>{        
        const validationErrors = []
        if (!validator.isInt(req.body.daysOfWork, { min: 1, max: 31 })) validationErrors.push({ msg: 'Please enter a valid number of days.' })
        if (validator.isEmpty(req.body.personName)) validationErrors.push({ msg: 'Please enter a name.' })
        if (validationErrors.length) {
            req.flash('errors', validationErrors)
            return res.redirect('/plan')
        }
        try{
            req.session.myData = "value";
            await Persons.create({personName: req.body.personName, userId: req.user.id, daysOfWork: req.body.daysOfWork})
            res.redirect('/plan')

        }catch(err){
            console.log(err)
        }
    },
    

    //create the code that creates the plan

    createdPlan: async (req,res)=>{
        console.log(req.user)
        try{
            const personName = await Persons.find({userId:req.user.id})
            const unavailableDays = req.body.unavailableDays || {}
            const selectedMonth = validator.isInt(req.body.month || '', { min: 1, max: 12 })
                ? Number(req.body.month)
                : new Date().getMonth() + 1
            const selectedYear = validator.isInt(req.body.year || '', { min: 1900, max: 3000 })
                ? Number(req.body.year)
                : new Date().getFullYear()
            const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
            const includeOffDays = req.body.offDays === 'on'
            const planDaysCount = getPlanDaysCount(selectedMonth, selectedYear, includeOffDays)
            const totalDaysOfWork = personName.reduce((total, person) => total + Number(person.daysOfWork || 0), 0)

            if (totalDaysOfWork !== planDaysCount) {
                req.flash('errors', [{
                    msg: `Total days of work must equal ${planDaysCount}. Current total: ${totalDaysOfWork}.`
                }])
                return res.redirect('/plan')
            }

            const assignedDays = {}
            const createdPlan = []
            let nextPersonIndex = 0

            personName.forEach(person => {
                assignedDays[person._id.toString()] = 0
            })

            for (let day = 1; day <= daysInMonth; day++) {
                if (!includeOffDays && isWeekend(day, selectedMonth, selectedYear)) {
                    createdPlan.push({
                        day,
                        personName: 'Off day'
                    })
                    continue
                }

                let assignedPerson = null

                for (let checkedPeople = 0; checkedPeople < personName.length; checkedPeople++) {
                    const person = personName[nextPersonIndex]
                    const personId = person._id.toString()
                    const personUnavailableDays = unavailableDays[personId] || []
                    const unavailable = Array.isArray(personUnavailableDays)
                        ? personUnavailableDays.includes(String(day))
                        : personUnavailableDays === String(day)
                    const reachedWorkLimit = assignedDays[personId] >= person.daysOfWork

                    nextPersonIndex = (nextPersonIndex + 1) % personName.length

                    if (!unavailable && !reachedWorkLimit) {
                        assignedPerson = person
                        assignedDays[personId]++
                        break
                    }
                }

                createdPlan.push({
                    day,
                    personName: assignedPerson ? assignedPerson.personName : 'No available person'
                })
            }

            res.render('createdPlan.ejs', {createdPlan, user: req.user, req: req, selectedMonth, selectedYear, monthName: monthNames[selectedMonth - 1]})
            
            
        }catch(err){
            console.log(err)
        }
    },

    deletePerson: async (req, res)=>{
        console.log(req.body.personIdFromJSFile)
        try{
            await Persons.deleteOne({_id:req.body.personIdFromJSFile})
            console.log('Deleted Person')
            res.json('Deleted It')
        }catch(err){
            console.log(err)
        }
    }
}
