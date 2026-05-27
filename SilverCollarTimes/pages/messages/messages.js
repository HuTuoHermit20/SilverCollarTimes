const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

Page({
  data: {
    activeTab: 'all',
    messages: [],
    unreadAll: 0,
    unreadUrgent: 0,
    fontMode: 'standard'
  },

  onShow() {
    const app = getApp()
    this.setData({ fontMode: app.globalData.fontMode || 'standard' })
    this.loadMessages()
  },

  onPullDownRefresh() {
    this.loadMessages().then(() => wx.stopPullDownRefresh())
  },

  async loadMessages() {
    try {
      const options = this.data.activeTab === 'urgent' ? { type: 'urgent' } : {}
      const messages = await mockApi.getMessages(options)

      const allMessages = storage.getMessages()
      const unreadAll = allMessages.filter(m => !m.read).length
      const unreadUrgent = allMessages.filter(m => m.category === 'sos' && !m.handled && !m.read).length

      const formatted = messages.map(m => ({
        ...m,
        timeText: this.formatTime(m.createdAt)
      }))

      this.setData({ messages: formatted, unreadAll, unreadUrgent })

      const app = getApp()
      app.loadUnreadCount()
    } catch (e) {
      console.error('加载消息失败:', e)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.loadMessages()
  },

  async openMessage(e) {
    const item = e.currentTarget.dataset.item
    if (!item.read) {
      await mockApi.markMessageRead(item.id)
    }

    if (item.type === 'missed') {
      wx.switchTab({ url: '/pages/records/records' })
    } else if (item.type === 'battery' || item.type === 'temperature') {
      wx.navigateTo({ url: '/pages/device-detail/device-detail' })
    } else if (item.category === 'sos') {
      wx.navigateTo({ url: '/pages/sos-detail/sos-detail' })
    }

    this.loadMessages()
  },

  async markAllRead() {
    await mockApi.markAllMessagesRead()
    wx.showToast({ title: '已全部标为已读', icon: 'success' })
    this.loadMessages()
  },

  async deleteMsg(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: async (res) => {
        if (res.confirm) {
          await mockApi.deleteMessageItem(id)
          this.loadMessages()
        }
      }
    })
  },

  callFromSOS(e) {
    const item = e.currentTarget.dataset.item
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

  handleSOSMsg(e) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: '确认操作',
      content: '是否标记为已处理？',
      success: (res) => {
        if (res.confirm) {
          const messages = storage.getMessages()
          const msg = messages.find(m => m.id === item.id)
          if (msg) {
            msg.handled = true
            storage.saveMessages(messages)
            this.loadMessages()
            wx.showToast({ title: '已标记为已处理', icon: 'success' })
          }
        }
      }
    })
  },

  goMessageSettings() {
    wx.navigateTo({ url: '/pages/message-settings/message-settings' })
  },

  formatTime(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const date = new Date(isoString)
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    if (diffHour < 24) return `${diffHour}小时前`

    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${m}-${d} ${h}:${min}`
  }
})
