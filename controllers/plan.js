const Persons = require('../models/Persons')
const validator = require('validator')



module.exports = {
    getPlan: async (req,res)=>{
        console.log(req.user)
        try{
            const personName = await Persons.find({userId:req.user.id})           
            res.render('plan.ejs', {plan: personName, user: req.user, req: req})
            
            
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
            res.render('createdPlan.ejs', {plan: personName, user: req.user, req: req})
            
            
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