const storage = require('../../utils/storage')

Page({
  data: {
    sosTime: '',
    deviceStatus: '在线'
  },

  onLoad() {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    this.setData({ sosTime: `${h}:${m}` })
  },

  callContact() {
    wx.showModal({
      title: '拨打电话',
      content: '即将呼叫紧急联系人，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '正在呼叫...', icon: 'none' })
        }
      }
    })
  },

  markHandled() {
    wx.showModal({
      title: '确认操作',
      content: '是否标记为已处理？',
      success: (res) => {
        if (res.confirm) {
          const messages = storage.getMessages()
          const sosMsgs = messages.filter(m => m.category === 'sos' && !m.handled)
          sosMsgs.forEach(m => { m.handled = true })
          storage.saveMessages(messages)
          wx.showToast({ title: '已标记为已处理', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1000)
        }
      }
    })
  }
})
