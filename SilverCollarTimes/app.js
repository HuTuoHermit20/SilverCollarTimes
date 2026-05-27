const storage = require('./utils/storage')
const mockApi = require('./utils/mock-api')

App({
  onLaunch() {
    this.initApp()
  },

  async initApp() {
    try {
      const appData = storage.getAppData()
      if (appData) {
        this.globalData = { ...this.globalData, ...appData }
      }
    } catch (e) {
      console.error('初始化数据失败:', e)
    }

    this.loadUnreadCount()

    if (this.globalData.fontMode === 'large') {
      this.setFontMode('large')
    }
  },

  loadUnreadCount() {
    const messages = storage.getMessages()
    const unreadCount = messages.filter(m => !m.read).length
    this.globalData.unreadCount = unreadCount
    this.updateTabBarBadge(unreadCount)
  },

  updateTabBarBadge(count) {
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: count > 99 ? '99+' : String(count)
      })
    } else {
      wx.removeTabBarBadge({ index: 2 })
    }
  },

  setFontMode(mode) {
    this.globalData.fontMode = mode
    storage.saveAppData({ fontMode: mode })
  },

  globalData: {
    userInfo: null,
    currentDeviceId: null,
    unreadCount: 0,
    fontMode: 'standard',
    deviceOnline: true
  }
})
