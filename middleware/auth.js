module.exports = {
    ensureAuth: function (req, res, next) {
      if (req.isAuthenticated()) {
        return next()
      }

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      res.redirect('/')
    }
  }
  
