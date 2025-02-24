const db = require('../models')
const User = db.User
const PublicMessage = db.PublicMessage
const PrivateMessage = db.PrivateMessage
const Room = db.Room
const { Op, Sequelize } = require("sequelize");

const socketController = {
  // getUser: (UserId) => {***
  getUser: (req, res) => {
    const UserId = req.body.UserId
    return User.findByPk(UserId, {
      attributes: ['id', 'name', 'avatar', 'account']
    }).then(user => {
      user = user.toJSON()
      user.content = "上線"
      user.type = "notice"
      return res.json(user)
    })
  },
  savePublicMessages: (req, res) => {
    const { content, id } = req.body
    return Promise.all([
      PublicMessage.create({
        content, UserId: id, type: "message" // type
      }),
      User.findByPk(id, {
        attributes: ['id', 'name', 'avatar', 'account']
      })
    ])
      .then(([newMessages, user]) => {
        user = user.toJSON()
        // return ([newMessages, user])***
        const results = []
        results.push(user)
        results.push(newMessages)
        return res.json(results)
      })
  },
  getPublicMessages: (req, res) => {
    return PublicMessage.findAll({
      raw: true,
      nest: true,
      include: { model: User, attributes: ['id', 'name', 'avatar', 'account'] },
      attributes: ['id', 'content', 'createdAt'],
      order: [['createdAt', 'ASC']]
    })
      .then(messages => {
        console.log(messages)
        return res.json(messages)
      })
  },
  getRoomId: (req, res) => {   //建立新 private room
    const { senderId, receiverId } = req.body
    let [id, id2] = [senderId, receiverId]
    const userArray = [id, id2]
    userArray.sort((id, id2) => id - id2) // 改為升冪排序[id, id2] / [id2, id]

    return Room.findOrCreate({   //+ include user
      where: { UserId: userArray[0], UserId2: userArray[1] }
    }).then(room => { // [ {room object}, Boolean(T:create;F:found)]
      return res.json(room[0].id)
    })
  },
  getAllUserRoomId: (req, res) => {
    const { UserId } = req.body
    return Room.findAll({
      raw: true,
      attributes: ["id"],
      where: { [Op.or]: [{ UserId }, { UserId2: UserId }] },
    }).then((rooms) => {    //[ { id: 1 }, { id: 3 } ]
      rooms = rooms.map(room => room.id)
      return res.json(rooms)  //[1, 3]
    })
  },
  savePrivateMessages: (req, res) => {
    const { content, receiverId, senderId: UserId, RoomId } = req.body    //實際上RoomId由後端自己算出
    return Promise.all([
      PrivateMessage.create({
        content, receiverId, UserId, RoomId, isRead: false
      }),
      User.findByPk(UserId, {
        attributes: ['id', 'name', 'avatar', 'account']
      })
    ])
      .then(([privateMessages, user]) => {
        privateMessages = privateMessages.toJSON()
        user = user.toJSON()
        let newMessages = { room: RoomId }  // 外面再包一個roomID---待確認是否還需要外面包room
        newMessages.newMessages = privateMessages
        newMessages.user = user
        return res.json(newMessages)
      })
  },
  getRoomPrivateMessages: (req, res) => {   //特定roomId所有歷史訊息
    const { RoomId } = req.body
    return PrivateMessage.findAll({
      where: { RoomId },
      order: [['createdAt', 'ASC']],
      include: { model: User, attributes: ['id', 'name', 'avatar', 'account'] },  //sender info
    }).then((privateMessages) => {
      return res.json(privateMessages)
    })
  },
  getLatestPrivateMessages: (req, res) => {   // 前端：使用者每個私人聊天室的最新歷史訊息
    const { UserId } = req.body
    return PrivateMessage.findAll({
      raw: true,
      nest: true,
      where: {
        [Op.or]: {
          UserId: UserId,
          receiverId: UserId
        }
      },
      attributes: [[Sequelize.fn('max', Sequelize.col('PrivateMessage.createdAt')), 'createdAt']],
      group: 'RoomId',
      order: [['createdAt', 'ASC']]
    })
      .then(async (latestCreatTime) => {
        let latestMessages = []
        for (let eachTime of latestCreatTime) {
          await PrivateMessage.findOne({
            raw: true,
            nest: true,
            where: {
              [Op.or]: {
                UserId: UserId,
                receiverId: UserId
              },
              createdAt: eachTime.createdAt
            },
            order: [['createdAt', 'ASC']],
            include: { model: User, attributes: ['id', 'name', 'avatar', 'account'] },  //sender info
          })
            .then(msg => {
              return latestMessages.push(msg)
            })
        }
        return res.json(latestMessages)
      })
  },
  readPrivateMessages: (req, res) => {  // currentUser是receiver的未讀訊息，要改成已讀
    const { currentUserId, RoomId } = req.body
    return PrivateMessage.update({ isRead: true }, {
      where: {
        RoomId,
        receiverId: currentUserId,
        isRead: false
      }
    }).then((readMessages) => {
      return res.json(readMessages) //updated quantity
    })
  },
  getUnReadCount: (req, res) => {
    const { UserId } = req.body
    return PrivateMessage.findAll({
      raw: true,
      where: {
        receiverId: UserId,
        isRead: false
      }
    }).then(unreadMessages => {
      return res.json(unreadMessages.length)
    })
  },
}

module.exports = socketController