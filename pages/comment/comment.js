// pages/comment/comment.js

//获取应用实例
const app = getApp()

Page({
  data: {
    star: 5,
    ifHaveComments: null,
    comment: null,
    foodId: null,
    foodName: '',
    commentTime: '',
    starMap: [
      '恶心，影响我加班的心情',
      '不好吃',
      '一般般',
      '取悦了我的味蕾',
      'Yummy！加班更有干劲了！',
    ],
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.init()
  },

  init: function() {
    if (app.globalData.todayInfo) {
      this.setData({
        ifHaveComments: app.globalData.todayInfo.my_order.my_rate,
        star: app.globalData.todayInfo.my_order.my_rate || 5,
        comment: app.globalData.todayInfo.my_order.comment,
        foodName: app.globalData.todayInfo.my_order.food.name,
        foodId: app.globalData.todayInfo.my_order.food.id,
        commentTime: app.globalData.todayInfo.my_order.comment &&
        app.globalData.todayInfo.my_order.comment.comment_time.replace('+08:06', ''),
      })
    }
  },

  // 点星星
  myStarChoose: function (e) {
    let star = parseInt(e.target.dataset.star) || 0;
    this.setData({
      star: star,
    });
  },

  // 提交评价
  formSubmit: function (e) {
    console.log('评价提交，携带数据为：', {
      star: this.data.star,
      content: e.detail.value.textarea
    })
    wx.showToast({
      title: '正在提交点评',
      icon: 'loading',
      duration: 3000
    });
    const _this = this
    app.request({
      api: 'foods/comment',
      method: 'POST',
      data: {
        'food_id': this.data.foodId,
        content: e.detail.value.textarea
      },
      success: function() {
        app.request({
          api: `food/${_this.data.foodId}/rate`,
          method: 'POST',
          data: {
            rate: _this.data.star
          },
          success: function () {
            wx.showToast({
              title: '点评成功',
              icon: 'success',
              duration: 3000
            });
            _this.refresh()
          }
        }, e)
      }
    }, e)
  },

  // 提交成功后刷新数据
  refresh: function () {
    const _this = this
    app.request({
      api: 'today',
      success: function (res) {
        app.globalData.todayInfo = res.data
        _this.init()
      }
    })
  }
});
