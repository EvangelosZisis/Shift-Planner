module.exports = {
    getSession: (req,res)=>{
        res.json({
            user: req.user
                ? {
                    id: req.user.id,
                    userName: req.user.userName,
                    displayName: req.user.displayName,
                    email: req.user.email
                }
                : null
        })
    }
}
