const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

const HEALTH_TIPS = [
  '降压药需要长期规律服用，不要随意停药哦',
  '服药期间注意低盐低脂饮食，健康生活从点滴做起',
  '定期测量血压，记录变化趋势很重要',
  '钙片最好在饭后半小时服用，吸收效果更好',
  '多种药物服用时，请遵医嘱间隔至少30分钟',
  '天气转凉时，心血管药物更需按时服用',
  '服药后如出现不适，请及时联系医生',
  '保持充足睡眠，有助于药物发挥最佳效果'
]

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

Page({
  data: {
    greeting: '',
    nickname: '家人',
    dateText: '',
    weekday: '',
    weather: { show: false, icon: '☀️', temp: '--', tip: '' },
    device: null,
    sosMessage: null,
    sosActive: false,
    takenCount: 0,
    totalCount: 0,
    completionRate: 0,
    missedCount: 0,
    nextMedication: '',
    recentRecord: null,
    lowMedicine: false,
    healthTip: '',
    fontMode: 'standard'
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
    const app = getApp()
    this.setData({ fontMode: app.globalData.fontMode || 'standard' })
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async initPage() {
    const app = getApp()
    const appData = storage.getAppData()
    const nickname = appData.nickname || '家人'
    this.setData({ nickname })

    this.updateGreeting()
    this.updateDate()
    this.loadHealthTip()
    this.checkSOS()
  },

  async refreshData() {
    await this.loadDevice()
    if (this.data.device) {
      await this.loadTodayMedication()
    }
    this.checkSOS()
  },

  updateGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好'
    if (hour >= 12 && hour < 18) greeting = '下午好'
    else if (hour >= 18 || hour < 5) greeting = '晚上好'
    this.setData({ greeting })
  },

  updateDate() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const w = WEEKDAYS[now.getDay()]
    this.setData({
      dateText: `${y}年${m}月${d}日`,
      weekday: `星期${w}`
    })
  },

  loadHealthTip() {
    const index = Math.floor(Math.random() * HEALTH_TIPS.length)
    this.setData({ healthTip: HEALTH_TIPS[index] })
  },

  async loadDevice() {
    try {
      const devices = await mockApi.getDeviceList()
      const app = getApp()
      const currentDeviceId = app.globalData.currentDeviceId || storage.getAppData().currentDeviceId

      let device = null
      if (currentDeviceId) {
        device = devices.find(d => d.deviceId === currentDeviceId)
      }
      if (!device && devices.length > 0) {
        device = devices[0]
        app.globalData.currentDeviceId = device.deviceId
        storage.saveAppData({ currentDeviceId: device.deviceId })
      }

      this.setData({ device: device || null })
    } catch (e) {
      console.error('加载设备失败:', e)
    }
  },

  async loadTodayMedication() {
    try {
      const deviceId = this.data.device.deviceId
      const plans = await mockApi.getTodayPlan(deviceId)
      const records = await mockApi.getRecords({
        startDate: this.data.dateText.replace(/[年月]/g, '-').replace('日', ''),
        endDate: this.data.dateText.replace(/[年月]/g, '-').replace('日', '')
      })

      const todayStr = this.data.dateText.replace(/[年月]/g, '-').replace('日', '')
      const todayRecords = records.filter(r => r.date === todayStr)

      let totalCount = 0
      plans.forEach(p => {
        totalCount += p.times.length
      })

      const takenCount = todayRecords.filter(r =>
        r.status === 'on_time' || r.status === 'delayed' || r.status === 'early'
      ).length

      const missedCount = todayRecords.filter(r => r.status === 'missed').length
      const completionRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0

      let nextMedication = ''
      if (takenCount === 0 && missedCount === 0 && plans.length > 0) {
        const allTimes = []
        plans.forEach(p => {
          p.times.forEach(t => allTimes.push(t))
        })
        allTimes.sort()
        nextMedication = allTimes[0]
      }

      let recentRecord = null
      if (todayRecords.length > 0) {
        const latest = todayRecords.sort((a, b) =>
          new Date(b.actualTime || b.plannedTime) - new Date(a.actualTime || a.plannedTime)
        )[0]
        const time = latest.actualTime
          ? new Date(latest.actualTime).toTimeString().slice(0, 5)
          : new Date(latest.plannedTime).toTimeString().slice(0, 5)
        let statusText = '未服'
        let statusClass = 'tag-danger'
        if (latest.status === 'on_time') { statusText = '准点'; statusClass = 'tag-success' }
        else if (latest.status === 'delayed') { statusText = `延迟${latest.delayMinutes}分钟`; statusClass = 'tag-warning' }
        else if (latest.status === 'early') { statusText = '提前'; statusClass = 'tag-success' }
        recentRecord = { time, name: latest.medicineName, statusText, statusClass }
      }

      this.setData({
        takenCount,
        totalCount,
        completionRate,
        missedCount,
        nextMedication,
        recentRecord
      })
    } catch (e) {
      console.error('加载用药数据失败:', e)
    }
  },

  checkSOS() {
    const messages = storage.getMessages()
    const sosMsg = messages.find(m => m.category === 'sos' && !m.handled)
    if (sosMsg) {
      this.setData({ sosMessage: sosMsg, sosActive: true })
    } else {
      this.setData({ sosMessage: null, sosActive: false })
    }
  },

  goSOSDetail() {
    wx.navigateTo({ url: '/pages/sos-detail/sos-detail' })
  },

  handleSOS() {
    wx.showModal({
      title: '确认操作',
      content: '是否标记为已处理？',
      success: (res) => {
        if (res.confirm) {
          const messages = storage.getMessages()
          const sosMsg = messages.find(m => m.category === 'sos' && !m.handled)
          if (sosMsg) {
            sosMsg.handled = true
            storage.saveMessages(messages)
            this.setData({ sosMessage: null, sosActive: false })
            wx.showToast({ title: '已标记为已处理', icon: 'success' })
          }
        }
      }
    })
  },

  goDeviceDetail() {
    wx.navigateTo({ url: '/pages/device-detail/device-detail' })
  },

  goBindDevice() {
    wx.navigateTo({ url: '/pages/device-bind/device-bind' })
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan' })
  },

  goRemind() {
    wx.showToast({ title: '补药提醒功能开发中', icon: 'none' })
  },

  callParent() {
    wx.showModal({
      title: '一键呼叫',
      content: '即将呼叫妈妈，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '正在呼叫妈妈...', icon: 'none' })
        }
      }
    })
  },

  showEnvHistory() {
    if (this.data.device) {
      wx.showModal({
        title: '环境监测',
        content: `当前温度: ${this.data.device.temperature}℃\n当前湿度: ${this.data.device.humidity}%\n数据每10分钟更新一次`,
        showCancel: false
      })
    }
  },

  toggleWeather() {
    const weather = this.data.weather
    weather.show = !weather.show
    this.setData({ weather })
  },

  closeTip() {
    this.setData({ healthTip: '' })
  }
})
