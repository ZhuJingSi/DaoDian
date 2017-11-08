//index.js

//获取应用实例
const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  onLoad: function () {
    this.getUserInfo()
  },
  // 获取用户信息
  getUserInfo: function() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  // 注册提交
  formSubmit: function (e) {
    const data = e.detail.value
    console.log('登记信息提交，携带数据为：', data)
    if (!data.name || !data.email) return
    app.request({
      api: 'register',
      method: 'POST',
      data: {
        name: data.name,
        email: data.email
      },
      success: function () {
        wx.showToast({
          title: '登记成功',
          icon: 'success',
          duration: 3000
        });
        app.init()
        wx.redirectTo({
          url: '../menu/menu'
        })
      }
    }, e)
  },
})
