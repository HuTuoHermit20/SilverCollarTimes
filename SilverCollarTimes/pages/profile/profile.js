const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

Page({
  data: {
    nickname: '家人',
    bindDays: 0,
    familyMembers: [],
    fontMode: 'standard',
    showDebug: false,
    versionClickCount: 0
  },

  onShow() {
    const app = getApp()
    const appData = storage.getAppData()
    this.setData({
      nickname: appData.nickname || '家人',
      fontMode: app.globalData.fontMode || 'standard',
      bindDays: this.calculateBindDays()
    })
    this.loadFamilyMembers()
  },

  calculateBindDays() {
    const devices = storage.getDevices()
    if (devices.length === 0) return 0
    const firstBind = devices.reduce((earliest, d) => {
      const t = new Date(d.bindTime).getTime()
      return t < earliest ? t : earliest
    }, Date.now())
    return Math.floor((Date.now() - firstBind) / 86400000) || 365
  },

  loadFamilyMembers() {
    const appData = storage.getAppData()
    const members = appData.familyMembers || [
      { id: '1', name: '我', role: 'admin' }
    ]
    this.setData({ familyMembers: members })
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          const nickname = res.content.trim()
          if (nickname) {
            storage.saveAppData({ nickname })
            this.setData({ nickname })
            wx.showToast({ title: '昵称已更新', icon: 'success' })
          }
        }
      }
    })
  },

  inviteFamily() {
    wx.showToast({ title: '邀请卡片已生成，请分享给微信好友', icon: 'none' })
  },

  toggleFont() {
    const app = getApp()
    const newMode = this.data.fontMode === 'large' ? 'standard' : 'large'
    app.setFontMode(newMode)
    this.setData({ fontMode: newMode })
    wx.showToast({ title: newMode === 'large' ? '已切换为大字体' : '已切换为标准字体', icon: 'success' })
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  goAbout() {
    this.setData({ versionClickCount: this.data.versionClickCount + 1 })
    if (this.data.versionClickCount >= 5) {
      this.setData({ showDebug: true, versionClickCount: 0 })
      wx.showToast({ title: '调试面板已开启', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/about/about' })
  },

  openConsult() {
    wx.showToast({ title: '正在连接健康顾问...', icon: 'none' })
  },

  openPharmacy() {
    wx.showToast({ title: '正在打开合作药店...', icon: 'none' })
  },

  openMall() {
    wx.showToast({ title: '积分商城开发中', icon: 'none' })
  },

  async debugSimulateMedication() {
    const plans = storage.getPlans()
    if (plans.length === 0) {
      wx.showToast({ title: '请先设置用药计划', icon: 'none' })
      return
    }
    try {
      await mockApi.simulateMedicationTaken(plans[0].id)
      wx.showToast({ title: '已模拟服药反馈', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '模拟失败', icon: 'error' })
    }
  },

  async debugTriggerSOS() {
    try {
      const deviceId = storage.getAppData().currentDeviceId || 'DEV_DEMO'
      await mockApi.triggerSOS(deviceId)
      wx.showToast({ title: 'SOS已触发，5秒后首页出现横幅', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '触发失败', icon: 'error' })
    }
  },

  debugResetData() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清除所有数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          storage.clearAllData()
          wx.showToast({ title: '数据已清除', icon: 'success' })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1000)
        }
      }
    })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将清除本地数据，确定退出？',
      success: (res) => {
        if (res.confirm) {
          storage.clearAllData()
          wx.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1000)
        }
      }
    })
  }
})
