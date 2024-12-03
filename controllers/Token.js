const { UserTokenActivity } = require("../models");
const moment = require("moment");
const { getAdminSetting } = require("./AdminSetting");

module.exports = class Token {
  constructor() {}

  static async createTokenActivity() {
    const userTokenActivity = await UserTokenActivity({
      lastActivityDate: new Date(),
    }).save();
    return { userTokenActivity };
  }

  static async checkTokenActivity(_id) {
    let status = false;
    const adminSettings = await getAdminSetting();
    if (!_id) return { status: false };
    const userTokenActivity = await UserTokenActivity.findOne({
      _id,
      lastActivityDate: {
        $gte: moment().add(-adminSettings.tokenActivityPeriod, "minutes"),
      },
    });
    if (userTokenActivity) status = true;
    return { status };
  }

  static async updateTokenLastActivityDate(_id) {
    return UserTokenActivity.updateOne(
      { _id },
      { $set: { lastActivityDate: new Date() } }
    );
  }

  static async deleteTokenLastActivity(_id) {
    return UserTokenActivity.deleteOne({ _id });
  }

  static async saveUserTokenActivity(user, expiredAt) {
    const activity = await UserTokenActivity.findOne({user});
    if (activity) {
      return UserTokenActivity.findOneAndUpdate(
        { user },
        { $set: { expiredAt, lastActivityDate: new Date() } }
      );
    } else {
      const activity = await UserTokenActivity({
        user,
        expiredAt,
        lastActivityDate: new Date(),
      }).save();
      return activity;
    }
  }

  static async deleteUserTokenActivity(_id) {
    return UserTokenActivity.deleteOne({ _id });
  }

  static async isActiveToken(user) {
    const activity = await UserTokenActivity.findOne({ user });
    if (!activity) {
      return false;
    }

    const currentDate = new Date().getTime();
    return (
      currentDate - new Date(activity.lastActivityDate).getTime() <
      activity.expiredAt
    );
  }
};
