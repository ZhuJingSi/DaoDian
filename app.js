// app.js
App({
  globalData: {
    host: 'https://daodian.daocloud.io',
    wss: 'wss://daodian.daocloud.io/socket.io',
    code: null,
    userInfo: null,
    daoUserInfo: null,
    token: null,
    todayInfo: null
  },
  onLaunch: function () {
    this.init()
  },
  init: function () {
    // 获取 code
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('login code', res.code)
        this.globalData.code = res.code;
        this.getUserInfo()
      }
    })
  },
  // 获取用户信息
  getUserInfo: function () {
    wx.getSetting({
      success: res => {
        console.log('getSetting', res)
        if (res.authSetting['scope.userInfo']) {
          console.log(res);
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              console.log('userInfo', res.userInfo)
              this.globalData.userInfo = res.userInfo
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
              this.getToken()
            },
            fail: res => {
              console.log('getSetting fail:', res);
            }
          })
        } else {
          console.log('not authorized, authorizing');
          wx.authorize({
            scope: 'scope.userInfo',
            success: res => {
              console.log('authorize success', res);
              this.getUserInfo();
            },
            fail: res => {
              console.log('wx.authorize fail:', res);
            },
            complete: res => {
              console.log('wx.authorize complete:', res);
            }
          })
        }
      }
    })
  },
  // 获取 token
  getToken: function () {
    console.log('getToken')
    const _this = this
    this.request({
      api: 'login',
      method: 'POST',
      data: {
        code: this.globalData.code,
        user_info: this.globalData.userInfo
      },
      success: function (res) {
        console.log('token', res.data)
        _this.globalData.token = res.data
        _this.checkToken()
      },
      fail: function (res) {
        console.log('getToken fail', res)
        wx.redirectTo({
          url: '/pages/index/index'
        })
      }
    })
  },
  // 检查 token 是否可用，不可用则跳到 注册页
  checkToken: function () {
    console.log('检查 token 是否可用')
    const _this = this
    this.request({
      api: 'user',
      success: function (res) {
        console.log('token 可用', res.data)
        _this.globalData.daoUserInfo = res.data
      },
      fail: function () {
        console.log('token 不可用，跳转到注册页')
        wx.redirectTo({
          url: '/pages/index/index'
        })
      }
    })
  },
  request: function (p, e) {
    const params = {
      url: `${this.globalData.host}/api/${p.api}`,
      method: p.method || 'GET',
      data: p.data,
      success: function (res) {
        if (res.statusCode == 200 && p.success) {
          p.success(res)
        } else if (p.fail) {
          p.fail(res)
        }
      },
      fail: p.fail || (() => {}),
      complete: p.complete || (() => { })
    }
    if (this.globalData.token) {
      params.header = {
        'X-Access-Token':  this.globalData.token
      }
    }
    wx.request(Object.assign(params))

    if (e && e.detail.formId) {
      // 上传 formid
      console.log('form发生了submit事件，formId 为：', e.detail.formId)
      wx.request({
        url: `${this.globalData.host}/api/form-id`,
        method: 'POST',
        data: {
          form_id: e.detail.formId
        },
      })
    }
  }
})
