// pages/menu/menu.js

const io = require('../../utils/socketio')

//获取应用实例
const app = getApp()
let getDaoUserInfoInterval = null
let showCountDownInterval = null

//事件
const MENU_UPDATE = 'MenuUpdate' // 今日菜单更新事件

Page({
  /**
   * 页面的初始数据
   */
  data: {
    daoUserInfo: null,
    closed: false,
    noToday: false,
    noOrder: false,
    host: app.globalData.host,
    sum: 0,
    chooseIndex: null,
    animationData: {},
    countDown: '',
    options: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getDaoUserInfo()
    this.connectSocket()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.clear()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    this.clear()
  },

  // 建立 websocket 连接
  connectSocket: function () {
    let socket = app.globalData.socket = new io(app.globalData.wss)
    socket.on('connect', res => {
      console.log('SocketIO 连接已打开！')
    });
    socket.on('disconnect', res => {
      console.log('SocketIO 连接已断开！')
    });
    socket.on('message', res => {
      console.log('收到消息', res)
    })
    // 注册菜单相关事件
    socket.on(MENU_UPDATE, data => {
      console.log('收到今日菜单更新:', data)
      this.showCountDown(data.deadline.replace('+08:00', ''))
      this.setData({
        menuId: data.id,
        options: data.foods,
        noToday: false
      })
      this.ifDue(data)
    })
  },

  // 轮询获取 daoUserInfo，有了 daoUserInfo 再显示菜单列表
  getDaoUserInfo: function () {
    const _this = this
    getDaoUserInfoInterval = setInterval(function () {
      console.log('getDaoUserInfo')
      if (app.globalData.daoUserInfo) {
        _this.setData({
          daoUserInfo: app.globalData.daoUserInfo
        })
        _this.getTodayInfo()
        clearInterval(getDaoUserInfoInterval)
      }
    }, 500)
  },

  // 获取今日菜单
  getTodayInfo: function (isRefresh) {
    const _this = this
    app.request({
      api: 'menus/today',
      success: function (res) {
        _this.showCountDown(res.data.deadline.replace('+08:00', ''))
        _this.setData({
          menuId: res.data.id,
          options: res.data.foods,
        })
        _this.ifDue(res.data)
      },
      fail: function () {
        _this.setData({
          noToday: true
        })
      },
      complete: function () {
        if (isRefresh) {
          wx.showToast({
            title: '已是最新数据',
            icon: 'success'
          });
        }
      }
    })
  },

  // 判断是否已到 DeadLine
  // 如果到了就不能点餐了，应该跳转到点评页面
  ifDue: function (todayInfo) {
    if (todayInfo.closed) {
      this.setData({
        closed: todayInfo.closed
      })
      const _this = this
      app.request({
        api: 'today',
        success: function (res) {
          // 将评论有关信息放到 globalData，这样评论页就不用再调一遍这个接口了
          app.globalData.todayInfo = res.data
          if (!res.data.my_order) {
            _this.setData({
              noOrder: !res.data.my_order
            })
          } else {
            wx.redirectTo({
              url: '../comment/comment'
            })
          }
        }
      })
    } else {
      // 标记当前用户已选的餐品
      if (this.data.daoUserInfo) {
        this.getChosen(this.data.daoUserInfo.id, this.data.options)
        this.setData({
          closed: todayInfo.closed,
          noOrder: todayInfo.closed
        })
      }
    }
  },

  // 标记当前用户已选的餐品
  getChosen: function (userId, menus) {
    for (let i = 0; i < menus.length; i++) {
      if (menus[i].orders.indexOf(userId) > -1) {
        this.setData({
          chooseIndex: i
        })
      }
    }
  },

  // 选择的哪一项
  choose: function (e) {
    const _this = this
    const menuId = this.data.menuId
    const foodId = e.currentTarget.dataset.foodid
    const index = e.currentTarget.dataset.index
    // 点击已选选项则视为取消行为
    if (_this.data.chooseIndex === index) {
      const api = `menu/${menuId}/order`
      app.request({
        api,
        method: 'DELETE',
        data: {},
        success: function (res) {
          _this.setData({
            chooseIndex: null
          })
          _this.getTodayInfo()
        }
      })
    } else {
      const api = `menu/${menuId}/order/${foodId}`
      app.request({
        api,
        method: 'POST',
        data: {},
        success: function (res) {
          _this.getTodayInfo()
        }
      })
    }
  },

  // 偷偷获取 formid
  formSubmit: function (e) {
    let formId = e.detail.formId;
    console.log('form发生了submit事件，formId 为：', formId)
    app.request({
      api: 'form-id',
      method: 'POST',
      data: {
        form_id: formId
      },
    })
  },

  // 倒计时计算
  countDown: function (deadline) {
    const now = new Date() //返回当前时间对象
    const endDate = new Date(deadline)
    const leftTime = endDate.getTime() - now.getTime()
    const leftsecond = parseInt(leftTime / 1000)
    const day = Math.floor(leftsecond / (60 * 60 * 24))
    const hour = Math.floor((leftsecond - day * 24 * 60 * 60) / 3600)
    const minute = Math.floor((leftsecond - day * 24 * 60 * 60 - hour * 3600) / 60)
    const second = Math.floor(leftsecond - day * 24 * 60 * 60 - hour * 3600 - minute * 60)
    return {
      day,
      hour,
      minute,
      second
    }
  },

  // 显示倒计时
  showCountDown: function (deadline) {
    if (showCountDownInterval) clearInterval(showCountDownInterval);
    const _this = this
    showCountDownInterval = setInterval(function () {
      const {
        day,
        hour,
        minute,
        second
      } = _this.countDown(deadline)
      _this.setData({
        countDown: `${hour}:${minute}:${second}`
      })
    }, 1000)
  },

  clear: function () {
    // 清除轮询
    clearInterval(getDaoUserInfoInterval)
    clearInterval(showCountDownInterval)
    // 关闭 socket 连接
    wx.closeSocket()
  },

  // 刷新
  refresh: function () {
    this.getTodayInfo(true)
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})