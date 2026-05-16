const Persons = require('../models/Persons')
const validator = require('validator')

const valueToString = value => value === undefined || value === null ? '' : String(value)
const isIntValue = (value, options) => validator.isInt(valueToString(value), options)
const isEmptyValue = value => validator.isEmpty(valueToString(value))
const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate()
const isWeekend = (day, month, year) => [0, 6].includes(new Date(year, month - 1, day).getDay())
const parseCustomOffDays = (customOffDays, month, year) => {
    const daysInMonth = getDaysInMonth(month, year)
    let parsedOffDays = []

    try {
        parsedOffDays = Array.isArray(customOffDays)
            ? customOffDays
            : JSON.parse(customOffDays || '[]')
    } catch (err) {
        parsedOffDays = []
    }

    return [...new Set(parsedOffDays
        .map(day => Number(day))
        .filter(day => Number.isInteger(day) && day >= 1 && day <= daysInMonth))]
}
const isOffDay = (day, month, year, customOffDays = []) => (
    isWeekend(day, month, year) || customOffDays.includes(day)
)
const getOffDaysCount = (month, year, customOffDays = []) => {
    const daysInMonth = getDaysInMonth(month, year)
    let offDays = 0

    for (let day = 1; day <= daysInMonth; day++) {
        if (isOffDay(day, month, year, customOffDays)) {
            offDays++
        }
    }

    return offDays
}
const getPlanDaysCount = (month, year, includeOffDays, customOffDays = []) => {
    const daysInMonth = getDaysInMonth(month, year)

    if (includeOffDays) {
        return daysInMonth
    }

    let weekdays = 0
    for (let day = 1; day <= daysInMonth; day++) {
        if (!isOffDay(day, month, year, customOffDays)) {
            weekdays++
        }
    }

    return weekdays
}
const isPersonUnavailable = (unavailableDays, personId, day) => {
    const personUnavailableDays = unavailableDays[personId] || []

    return Array.isArray(personUnavailableDays)
        ? personUnavailableDays.includes(String(day))
        : personUnavailableDays === String(day)
}
const getRandomWeightedCandidate = candidates => {
    const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0)
    let randomWeight = Math.random() * totalWeight

    for (const candidate of candidates) {
        randomWeight -= candidate.weight

        if (randomWeight <= 0) {
            return candidate
        }
    }

    return candidates[candidates.length - 1]
}
const scoreCreatedPlan = (people, createdPlan, includeOffDays, allowConsecutiveShifts, selectedMonth, selectedYear, customOffDays = []) => {
    let score = 0
    let noAvailableDays = 0

    people.forEach(person => {
        const personId = person._id.toString()
        const totalWorkDays = Number(person.daysOfWork || 0)
        const totalOffDays = Number(person.daysOfOffDays || 0)
        const personDays = createdPlan
            .filter(planDay => planDay.personId === personId)
            .map(planDay => planDay.day)
        const personOffDays = createdPlan.filter(planDay => (
            planDay.personId === personId &&
            isOffDay(planDay.day, selectedMonth, selectedYear, customOffDays)
        )).length

        score -= Math.abs(totalWorkDays - personDays.length) * 1000000

        if (includeOffDays) {
            score -= Math.abs(totalOffDays - personOffDays) * 1000000
        }

        if (personDays.length <= 1) {
            score += 10000
            return
        }

        const gaps = []
        for (let index = 1; index < personDays.length; index++) {
            gaps.push(personDays[index] - personDays[index - 1])
        }

        const minGap = Math.min(...gaps)
        const averageGap = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
        const idealGap = daysInMonthForSpacing(selectedMonth, selectedYear, includeOffDays, customOffDays) / personDays.length
        const closeGapPenalty = gaps.reduce((total, gap) => total + Math.max(idealGap - gap, 0) ** 2, 0)
        const unevenGapPenalty = gaps.reduce((total, gap) => total + Math.abs(gap - averageGap), 0)
        const everyOtherDayCount = gaps.filter(gap => gap === 2).length

        score += minGap * 100000
        score += averageGap * 1000
        score -= closeGapPenalty * 500
        score -= unevenGapPenalty * 100
        score -= everyOtherDayCount * 750000

        if (!allowConsecutiveShifts && minGap === 1) {
            score -= 1000000
        }
    })

    createdPlan.forEach(planDay => {
        if (planDay.personName === 'No available person') {
            noAvailableDays++
        }
    })

    score -= noAvailableDays * 1000000
    score += Math.random()

    return score
}
const daysInMonthForSpacing = (month, year, includeOffDays, customOffDays = []) => {
    if (includeOffDays) {
        return getDaysInMonth(month, year)
    }

    return getPlanDaysCount(month, year, includeOffDays, customOffDays)
}
const createRandomizedPlan = (people, unavailableDays, selectedMonth, selectedYear, includeOffDays, allowConsecutiveShifts, customOffDays) => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
    const attempts = 1500
    const maxPlans = 10
    const bestPlans = []

    for (let attempt = 0; attempt < attempts; attempt++) {
        const assignedDays = {}
        const assignedOffDays = {}
        const lastAssignedDay = {}
        const createdPlan = []
        let previousAssignedPersonId = null
        let assignedFirstShift = false

        people.forEach(person => {
            const personId = person._id.toString()
            assignedDays[personId] = 0
            assignedOffDays[personId] = 0
            lastAssignedDay[personId] = null
        })

        for (let day = 1; day <= daysInMonth; day++) {
            const offDay = isOffDay(day, selectedMonth, selectedYear, customOffDays)

            if (!includeOffDays && offDay) {
                createdPlan.push({
                    day,
                    personName: 'Off day'
                })
                previousAssignedPersonId = null
                continue
            }

            const candidates = people
                .map(person => {
                    const personId = person._id.toString()
                    const totalWorkDays = Number(person.daysOfWork || 0)
                    const totalOffDays = Number(person.daysOfOffDays || 0)
                    const regularWorkDays = includeOffDays ? totalWorkDays - totalOffDays : totalWorkDays
                    const assignedRegularDays = assignedDays[personId] - assignedOffDays[personId]
                    const remainingDays = totalWorkDays - assignedDays[personId]
                    const remainingOffDays = totalOffDays - assignedOffDays[personId]
                    const remainingRegularDays = regularWorkDays - assignedRegularDays
                    const unavailable = isPersonUnavailable(unavailableDays, personId, day)
                    const workedPreviousDay = !allowConsecutiveShifts && previousAssignedPersonId === personId
                    const workedTwoDaysAgo = lastAssignedDay[personId] === day - 2

                    if (
                        remainingDays <= 0 ||
                        unavailable ||
                        workedPreviousDay ||
                        (includeOffDays && offDay && remainingOffDays <= 0) ||
                        (includeOffDays && !offDay && remainingRegularDays <= 0)
                    ) {
                        return null
                    }

                    const gap = lastAssignedDay[personId] === null
                        ? daysInMonth + day
                        : day - lastAssignedDay[personId]

                    return {
                        person,
                        gap,
                        remainingDays,
                        weight: (gap + 1) * (remainingDays + 1) * (workedTwoDaysAgo ? 0.01 : 1) * (Math.random() + 0.5)
                    }
                })
                .filter(Boolean)
            let selectedCandidate = null

            if (!candidates.length) {
                selectedCandidate = null
            } else if (!assignedFirstShift) {
                selectedCandidate = candidates[Math.floor(Math.random() * candidates.length)]
            } else {
                selectedCandidate = getRandomWeightedCandidate(candidates)
            }

            const assignedPerson = selectedCandidate ? selectedCandidate.person : null

            if (assignedPerson) {
                const assignedPersonId = assignedPerson._id.toString()
                assignedDays[assignedPersonId]++
                if (offDay) {
                    assignedOffDays[assignedPersonId]++
                }
                lastAssignedDay[assignedPersonId] = day
                previousAssignedPersonId = assignedPersonId
                assignedFirstShift = true
            } else {
                previousAssignedPersonId = null
            }

            createdPlan.push({
                day,
                personId: assignedPerson ? assignedPerson._id.toString() : null,
                personName: assignedPerson ? assignedPerson.personName : 'No available person'
            })
        }

        const score = scoreCreatedPlan(
            people,
            createdPlan,
            includeOffDays,
            allowConsecutiveShifts,
            selectedMonth,
            selectedYear,
            customOffDays
        )
        const planSignature = createdPlan.map(planDay => planDay.personName).join('|')

        if (!bestPlans.some(planResult => planResult.signature === planSignature)) {
            bestPlans.push({
                plan: createdPlan,
                score,
                signature: planSignature
            })
            bestPlans.sort((a, b) => b.score - a.score)

            if (bestPlans.length > maxPlans) {
                bestPlans.pop()
            }
        }
    }

    return bestPlans.map(planResult => planResult.plan)
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
            res.json({
                plan: personName,
                user: {
                    id: req.user.id,
                    userName: req.user.userName,
                    displayName: req.user.displayName
                },
                selectedMonth,
                selectedYear,
                daysInMonth,
                monthNames
            })
            
            
        }catch(err){
            console.log(err)
        }
    },
    
    addPerson: async (req, res)=>{        
        const validationErrors = []
        const regularDaysOfWork = Number(req.body.daysOfWork || 0)
        const daysOfOffDays = Number(req.body.daysOfOffDays || 0)
        const totalScheduledDays = regularDaysOfWork + daysOfOffDays

        if (!isIntValue(req.body.daysOfWork, { min: 1, max: 31 })) validationErrors.push({ msg: 'Please enter a valid number of days.' })
        if (req.body.daysOfOffDays && !isIntValue(req.body.daysOfOffDays, { min: 0, max: 31 })) validationErrors.push({ msg: 'Please enter a valid number of off days.' })
        if (totalScheduledDays > 31) validationErrors.push({ msg: 'Work days plus off days cannot be greater than 31.' })
        if (isEmptyValue(req.body.personName)) validationErrors.push({ msg: 'Please enter a name.' })
        if (validationErrors.length) {
            return res.status(400).json({ errors: validationErrors })
        }
        try{
            req.session.myData = "value";
            await Persons.create({
                personName: req.body.personName,
                userId: req.user.id,
                daysOfWork: totalScheduledDays,
                daysOfOffDays
            })
            res.status(201).json({ ok: true })

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
            const selectedMonth = isIntValue(req.body.month, { min: 1, max: 12 })
                ? Number(req.body.month)
                : new Date().getMonth() + 1
            const selectedYear = isIntValue(req.body.year, { min: 1900, max: 3000 })
                ? Number(req.body.year)
                : new Date().getFullYear()
            const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
            const customOffDays = parseCustomOffDays(req.body.customOffDays, selectedMonth, selectedYear)
            const includeOffDays = req.body.offDays === 'on'
            const allowConsecutiveShifts = req.body.allowConsecutiveShifts === 'on'
            const planDaysCount = getPlanDaysCount(selectedMonth, selectedYear, includeOffDays, customOffDays)
            const offDaysCount = getOffDaysCount(selectedMonth, selectedYear, customOffDays)
            const totalDaysOfWork = personName.reduce((total, person) => total + Number(person.daysOfWork || 0), 0)
            const totalDaysOfOffDays = personName.reduce((total, person) => total + Number(person.daysOfOffDays || 0), 0)
            const validationErrors = []

            if (totalDaysOfWork !== planDaysCount) {
                validationErrors.push({
                    msg: `Total days of work must equal ${planDaysCount}. Current total: ${totalDaysOfWork}.`
                })
            }

            if (includeOffDays && totalDaysOfOffDays !== offDaysCount) {
                validationErrors.push({
                    msg: `Total off days must equal ${offDaysCount}. Current total: ${totalDaysOfOffDays}.`
                })
            }

            if (validationErrors.length) {
                return res.status(400).json({ errors: validationErrors })
            }

            const createdPlans = createRandomizedPlan(
                personName,
                unavailableDays,
                selectedMonth,
                selectedYear,
                includeOffDays,
                allowConsecutiveShifts,
                customOffDays
            )
            const createdPlan = createdPlans[0] || []

            res.json({
                createdPlan,
                createdPlans,
                user: {
                    id: req.user.id,
                    userName: req.user.userName,
                    displayName: req.user.displayName
                },
                selectedMonth,
                selectedYear,
                customOffDays,
                monthName: monthNames[selectedMonth - 1]
            })
            
            
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
