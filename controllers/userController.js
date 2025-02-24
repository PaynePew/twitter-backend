const { Op, Sequelize } = require("sequelize")
const bcrypt = require('bcryptjs')
const db = require('../models')
const helpers = require('../_helpers')
const User = db.User
const Tweet = db.Tweet
const Like = db.Like
const Reply = db.Reply
const Followship = db.Followship
const imgur = require('imgur')

// JWT
const jwt = require('jsonwebtoken')
const passportJWT = require('passport-jwt')
const ExtractJwt = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy
const tweet = require('../models/tweet')

const userController = {
  signIn: (req, res) => {
    const { account, password } = req.body
    if (!account || !password) {
      return res.json({ status: 'error', message: '請輸入必填欄位!' })
    }
    User.findOne({ where: { account } }).then(user => {
      if (!user) {
        return res.status(401).json({ status: 'error', message: '帳號不存在!' })
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ status: 'error', message: '帳號不存在!' })
      }
      if (user.role === "admin") {
        return res.json({ status: 'error', message: '帳號不存在!' })
      }
      // issue token
      const payload = { id: user.id }
      const token = jwt.sign(payload, process.env.JWT_SECRET)
      // console.log('token = jwt.sign with', process.env.JWT_SECRET) // OK
      return res.json({
        status: 'success',
        message: 'OK',
        token: token,
        user: {
          id: user.id, name: user.name, account: user.account, email: user.email, role: user.role
        }
      })
    }).catch(error => {
      console.log(error)  //error.name, error.message
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
  adminSignIn: (req, res) => {
    if (!req.body.account || !req.body.password) {
      return res.json({ status: 'error', message: '請輸入必填欄位' })
    }
    // 比對User資料庫、比對密碼
    let { account, password } = req.body
    User.findOne({ where: { account } }).then(user => {
      if (!user) {
        return res.status(401).json({ status: 'error', message: '' })
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ status: 'error', message: '' })
      }
      if (user.role !== "admin") {
        return res.status(401).json({ status: 'error', message: '帳號不存在' })
      }
      // issue token
      var payload = { id: user.id }
      var token = jwt.sign(payload, process.env.JWT_SECRET)
      // console.log('token = jwt.sign with', process.env.JWT_SECRET) // OK
      return res.json({
        status: 'success',
        message: 'OK',
        token: token,
        user: {
          id: user.id, name: user.name, account: user.account, email: user.email, role: user.role
        }
      })
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
  signUp: (req, res) => {
    const { account, name, email, password, checkPassword } = req.body

    // 確認欄位是否皆有填寫
    if (!account || !name || !email || !password || !checkPassword) {
      return res.status(400).json({ status: 'error', message: '請輸入必填欄位!' })
    }
    // 確認密碼
    if (password !== checkPassword) {
      return res.status(400).json({ status: 'error', message: '確認密碼輸入錯誤!' })
    }

    // 確認email或account是否重複
    return User.findOne({
      where: {
        [Op.or]: [
          { email },
          { account }
        ]
      }
    }).then(user => {
      if (user) {
        if (user.email === email) {
          return res.json({ status: 'error', message: 'email已重覆註冊！' })
        }
        if (user.account === account) {
          return res.json({ status: 'error', message: 'account已重覆註冊！' })
        }
      } else {
        User.create({
          account, email, name, role: null,
          avatar: 'https://i.imgur.com/tdi3NGa.png',
          cover: 'https://loremflickr.com/1200/400/landscape',
          password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)),
        }).then(user => {
          return res.json({ status: 'success', message: '成功註冊!' })
        })
      }
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
  getUserAccountSetting: (req, res) => {
    const userId = helpers.getUser(req).id
    User.findByPk(userId)
      .then(user => {
        return res.json({
          user: {
            name: user.name,
            account: user.account,
            email: user.email
          }
        })
      }).catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },
  putUserAccountSetting: (req, res) => {
    const userId = helpers.getUser(req).id
    const { account, name, email, password, checkPassword } = req.body

    // 確認欄位是否皆有填寫
    if (!account || !name || !email || !password || !checkPassword) {
      return res.status(400).json({ status: 'error', message: '請輸入必填欄位！' })
    }
    // 確認密碼
    if (password !== checkPassword) {
      return res.status(400).json({ status: 'error', message: '確認密碼輸入錯誤!' })
    }

    // 確認email或account是否重複
    User.findOne({
      where: {
        [Op.or]: [
          { email },
          { account }
        ],
        $not: [
          { id: userId }
        ],
      }
    }).then(user => {
      if (user) {
        if (user.email === email) {
          return res.json({ status: 'error', message: 'email已重覆註冊！' })
        }
        if (user.account === account) {
          return res.json({ status: 'error', message: 'account已重覆註冊！' })
        }
      } else {
        return User.findByPk(userId).then(user => {
          user.update({
            account, email, name,
            password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)),
          })
          return res.json({ status: 'success', message: '成功編輯' })
        })
      }
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
  getCurrentUser: (req, res) => {
    const userId = helpers.getUser(req).id
    return User.findByPk(userId).then(user => {
      return res.json(
        { user }
      )
    })
  },
  getUserProfile: (req, res) => {
    const UserId = req.params.id
    return User.findByPk(UserId, {
      attributes: ['id', 'name', 'account', 'avatar', 'cover', 'introduction'],
      include: [
        { model: User, as: 'Followers', attributes: ['id', 'name', 'account', 'avatar'] },
        { model: User, as: 'Followings', attributes: ['id', 'name', 'account', 'avatar'] },
        { model: Tweet, attributes: ['id'] }
      ]
    }).then(user => {
      if (!user) {
        return res.status(400).json(({ status: 'error', message: '該使用者不存在' }))
      }
      user = user.toJSON()
      user.FollowerCount = user.Followers.length //跟隨者人數
      user.FollowingCount = user.Followings.length //跟隨中人數
      user.isFollowed = helpers.getUser(req).Followings ? helpers.getUser(req).Followings.map(d => d.id).includes(user.id) : null
      user.TweetCount = user.Tweets.length
      delete user.Followers
      delete user.Followings
      delete user.Tweets
      return res.json(user)
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試'})
    })
  },
  getUserInfo: (req, res) => {
    const userId = helpers.getUser(req).id
    return User.findByPk(userId)
      .then(user => {
        if (!user) {
          return res.status(400).json(({ status: 'error', message: '該使用者不存在' }))
        }
        return res.json({
          user: {
            name: user.name,
            introduction: user.introduction,
            avatar: user.avatar,
            cover: user.cover
          }
        })
      })
      .catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },
  editUserInfo: async (req, res) => {
    const userId = helpers.getUser(req).id
    const name = req.body.name
    // 確認name有填寫
    if (!name) {
      return res.status(400).json({ status: 'error', message: '需填入姓名' })
    }

    // 如果有上傳圖片，就上傳到imgur中
    const { files } = req
    imgur.setClientId(process.env.IMGUR_CLIENT_ID) // 設定imgur的clientId
    if (files) {
      if (files.avatar) {
        // 確認是否有avatar上傳，有就上傳到imgur
        const avatar = await imgur.uploadFile(files.avatar[0].path)
        req.body.avatar = avatar.link
      }
      if (files.cover) {
        // 確認是否有cover上傳，有就上傳到imgur
        const cover = await imgur.uploadFile(files.cover[0].path)
        req.body.cover = cover.link
      }
    } if (req.body.noCover) {
      req.body.cover = req.body.noCover;
    }
    return User.update({ ...req.body }, { where: { id: userId } })
      .then((user) => {
        return res.json({ status: 'success', message: '成功修改使用者Profile' })
      })
      .catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },

  //取得特定瀏覽人次id
  getOneLikes: (req, res) => {
    const UserId = req.params.id
    return Like.findAll({
      where: { UserId },
      // attributes: ['id', 'createdAt'] , // 加了結果只剩一筆
      order: [['createdAt', 'DESC']],
      include: {
        model: Tweet, attributes: ['id', 'description', 'createdAt'], include: [
          { model: User, attributes: ['id', 'name', 'account', 'avatar'] },
          { model: User, as: 'LikedUsers', attributes: ['id'] },
          Reply
        ]
      }
    })
      .then((tweets) => {
        tweets = tweets.map(tweet => ({
          ...tweet.dataValues,
          repliedCount: tweet.Tweet.Replies.length,
          likedCount: tweet.Tweet.LikedUsers.length,
          isLiked: helpers.getUser(req).LikedTweets ? helpers.getUser(req).LikedTweets.map(d => d.id).includes(tweet.Tweet.id) : null
        }))
        tweets.forEach(tweet => {
          delete tweet.Tweet.dataValues.Replies
          delete tweet.Tweet.dataValues.LikedUsers
        })
        return res.json(tweets)
      })
      .catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },
  getOneRepliedTweets: (req, res) => {
    const UserId = req.params.id
    return Reply.findAll({
      where: { UserId },
      order: [['createdAt', 'DESC']],
      include: {
        model: Tweet, attributes: ['id', 'description', 'createdAt'], include: [
          { model: User, attributes: ['id', 'name', 'account'] }]
      }
    })
      .then(replies => {
        return res.json(replies)
      })
      .catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },
  getOneTweets: (req, res) => {
    const UserId = req.params.id
    return Tweet.findAll({
      where: { UserId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'LikedUsers', attributes: ['id'] },
        Reply
      ]
    })
      .then(tweets => {
        tweets = tweets.map(tweet => ({
          ...tweet.dataValues,
          repliedCount: tweet.Replies.length,
          likedCount: tweet.LikedUsers.length,
          isLiked: helpers.getUser(req).LikedTweets ? helpers.getUser(req).LikedTweets.map(d => d.id).includes(tweet.id) : null
        }))
        tweets.forEach(tweet => {
          delete tweet.Replies
          delete tweet.LikedUsers
        })
        return res.json(tweets)
      })
      .catch(error => {
        console.log(error)
        return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
      })
  },
  getOneFollowers: (req, res) => {
    const UserId = req.params.id
    return User.findByPk(UserId, {
      attributes: ['id'],
      include: { model: User, as: "Followers", attributes: ['id', 'name', 'account', 'introduction', 'avatar'] },
      order: [[User.associations.Followers, Followship, 'createdAt', 'DESC']],
    }).then(users => {
      if (!users) {
        return res.status(400).json(({ status: 'error', message: '該使用者不存在' }))
      }
      users = users.Followers
      users = users.map((user) => ({
        ...user.dataValues,
        isFollowed: helpers.getUser(req).Followings ? helpers.getUser(req).Followings.map(d => d.id).includes(user.id) : null,
        followerId: user.Followship.followerId
      }))
      return res.json(users)
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
  getOneFollowings: (req, res) => {
    const UserId = req.params.id
    return User.findByPk(UserId, {
      attributes: ['id'],
      include: { model: User, as: "Followings", attributes: ['id', 'name', 'account', 'introduction', 'avatar'] },
      order: [[User.associations.Followings, Followship, 'createdAt', 'DESC']],
    }).then(users => {
      if (!users) {
        return res.status(400).json(({ status: 'error', message: '該使用者不存在' }))
      }
      users = users.Followings
      users = users.map((user) => ({
        ...user.dataValues,
        isFollowed: helpers.getUser(req).Followings ? helpers.getUser(req).Followings.map(d => d.id).includes(user.id) : null,
        followingId: user.Followship.followingId
      }))
      return res.json(users)
    }).catch(error => {
      console.log(error)
      return res.status(500).json({ status: 'error', message: '發生未預期錯誤，請重新嘗試' })
    })
  },
}



module.exports = userController
