const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const userController = require('../controllers/userController')
const tweetController = require('../controllers/tweetController')


// const authenticated = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     return next()
//   }
//   res.redirect('/api/signin')
// }
const authenticated = passport.authenticate('jwt', { session: false })

const authenticatedAdmin = (req, res, next) => {
  if (req.user) {
    if (req.user.role === "admin") { return next() }
    return res.json({ status: 'error', message: 'permission denied' })
  } else {
    return res.json({ status: 'error', message: 'permission denied' })
  }
}


//user相關
router.post('/api/signin', userController.signIn)






//tweets相關   待補authenticatedAdmin
router.get('/api/tweets', authenticated, tweetController.getTweets)
router.get('/api/tweets/:id', authenticated, tweetController.getTweet)
router.post('/api/tweets', authenticated, tweetController.postTweet)
router.get('/api/admin/tweets', tweetController.getAdminTweets)
router.delete('/api/admin/tweets/:id', tweetController.deleteTweet)


//likes相關







//replies相關



//followships相關









//admin相關

module.exports = router
