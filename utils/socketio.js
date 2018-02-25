/**
 * 微信小程序专用 SocketIO 库
 * 暂时不支持微信基础库 1.7.0 之后的 SocketTask
 *
 * 暂时不支持 room namespace 等特性
 */

/** socket.io 协议常量 */
var packets = {
  open: 0, // non-ws
  close: 1, // non-ws
  ping: 2,
  pong: 3,
  message: 4,
  upgrade: 5,
  noop: 6
}
var events = {
  CONNECT: 0,
  DISCONNECT: 1,
  EVENT: 2,
  ACK: 3,
  ERROR: 4,
  BINARY_EVENT: 5,
  BINARY_ACK: 6
}

class WxSocketIO {
  constructor(url) {
    this.isConnected = false
    this.connect(url)
    this.url = url
    this._callbacks = {}
    this.PING_CHECK_INTERVAL = 10000
  }

  _url(url) {
    return `${url}/?EIO=3&transport=websocket`
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      wx.onSocketOpen((response) => {
        this.isConnected = true
        this.fire('connect')
        resolve(response)
      })
      wx.onSocketError(error => {
        if (this.isConnected) {
          this.fire('error', error)
        } else {
          reject(error)
        }
      })
      wx.onSocketMessage(message => this._handleMessage(message))
      wx.onSocketClose(result => {
        if (this.isConnected) {
          this.fire('error', new Error("The websocket was closed by server"))
          this.isConnected = false
          this.destroy()
          console.log('socket closed unexpectedly, reconnect')
          setTimeout(() => this.connect(url), 0.5)
        } else {
          this.fire('disconnect')
        }
      })
      wx.connectSocket({
        url: this._url(url)
      })
    })
  }

  ping() {
    if (!this.isConnected) return
    wx.sendSocketMessage({
      data: [packets.ping, 'probe'].join('')
    })
  }

  pong() {
    if (!this.isConnected) return
    wx.sendSocketMessage({
      data: [packets.pong, 'probe'].join('')
    })
  }

  ping_check() {
    this.pingCheckInterval = setInterval(()=>this.ping.apply(this), this.PING_CHECK_INTERVAL)
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        this.isConnected = false
        // wx.onSocketClose(resolve)
        wx.closeSocket()
        // this.fire('disconnect')
      } else {
        reject(new Error('socket is not connected'))
      }
    })
  }

  on(event, callback) {
    this._callbacks[event] = this._callbacks[event] || []
    let cbs = this._callbacks[event]
    if (!cbs.includes(callback)) {
      cbs.push(callback)
    }
  }

  emit(event, data) {
    wx.sendSocketMessage({
      data: [packets.message, events.EVENT, JSON.stringify([event, data])].join("")
    })
  }

  fire(event, data) {
    (this._callbacks[event] || []).forEach(cb => {
      setTimeout(() => cb(data))
    })
  }

  destroy() {
    this._callbacks = []
    clearInterval(this.pingCheckInterval)
  }

  _handleMessage({
    data
  }) {
    const [match, packet, event, content] = /^(\d)(\d?)(.*)$/.exec(data)
    if (+event === events.EVENT) {
      switch (+packet) {
        case packets.message:
          let pack
          try {
            pack = JSON.parse(content)
          } catch (error) {
            console.error('解析 ws 数据包失败：')
            console.error(error)
          }
          const [e, d] = pack
          this.fire(e, d)
          break
      }
    } else if (+packet == packets.ping) {
      this.pong()
    } else if (+packet == packets.open) {
      try {
        let pack = JSON.parse(content);
        if (pack && pack.pingInterval) this.PING_CHECK_INTERVAL = pack.pingInterval;
        this.ping_check()
      } catch (error) {
        console.error('解析 ws 数据包失败：')
        console.error(error)
      }
    }
  }
}

module.exports = WxSocketIO
