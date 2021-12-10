'use strict';
module.exports = (sequelize, DataTypes) => {
  const PrivateMessage = sequelize.define('PrivateMessage', {
    SenderId: DataTypes.INTEGER,
    RecieverId: DataTypes.INTEGER,
    RoomId: DataTypes.INTEGER
  }, {});
  PrivateMessage.associate = function (models) {
    // associations can be defined here
    PrivateMessage.belongsTo(models.User)
    PrivateMessage.belongsTo(models.Room)
  };
  return PrivateMessage;
};