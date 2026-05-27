const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

Page({
  data: {
    currentView: 'day',
    statusFilters: ['全部', '准时', '延迟', '漏服', '跳过'],
    statusFilterIndex: 0,
    dayRecords: [],
    weekDays: [],
    monthDays: [],
    monthYear: '',
    currentMonth: 0,
    currentYear: 0,
    selectedDate: '',
    stats: { weekRate: 0, monthRate: 0, consecutiveDays: 0 },
    fontMode: 'standard'
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear(),
      selectedDate: this.formatDate(now)
    })
  },

  onShow() {
    const app = getApp()
    this.setData({ fontMode: app.globalData.fontMode || 'standard' })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    await Promise.all([
      this.loadDayRecords(),
      this.loadWeekData(),
      this.loadMonthData(),
      this.loadStats()
    ])
  },

  async loadDayRecords() {
    try {
      const deviceId = this.getDeviceId()
      if (!deviceId) return

      const records = await mockApi.getRecords({
        startDate: this.data.selectedDate,
        endDate: this.data.selectedDate
      })

      const statusMap = { 'on_time': '准时', 'delayed': '延迟', 'missed': '漏服', 'skipped': '跳过', 'early': '提前' }
      const statusTagMap = { 'on_time': 'tag-success', 'delayed': 'tag-warning', 'missed': 'tag-danger', 'skipped': 'tag-default', 'early': 'tag-success' }
      const statusDotMap = { 'on_time': 'online', 'delayed': 'warning', 'missed': 'danger', 'skipped': 'offline', 'early': 'online' }

      let filtered = records
      if (this.data.statusFilterIndex > 0) {
        const filterStatus = ['on_time', 'delayed', 'missed', 'skipped'][this.data.statusFilterIndex - 1]
        filtered = records.filter(r => r.status === filterStatus)
      }

      const dayRecords = filtered.map(r => ({
        ...r,
        plannedTime: new Date(r.plannedTime).toTimeString().slice(0, 5),
        actualTime: r.actualTime ? new Date(r.actualTime).toTimeString().slice(0, 5) : null,
        statusText: statusMap[r.status] || r.status,
        statusTagClass: statusTagMap[r.status] || 'tag-default',
        statusClass: statusDotMap[r.status] || 'offline'
      }))

      this.setData({ dayRecords })
    } catch (e) {
      console.error('加载日记录失败:', e)
    }
  },

  async loadWeekData() {
    const now = new Date()
    const dayOfWeek = now.getDay() || 7
    const weekDays = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - dayOfWeek + 1 + i)
      const dateStr = this.formatDate(d)
      const dayNames = ['一', '二', '三', '四', '五', '六', '日']
      weekDays.push({
        date: dateStr,
        dayName: dayNames[i],
        day: d.getDate(),
        isToday: dateStr === this.formatDate(now),
        hasRecords: false,
        rate: 0
      })
    }

    try {
      const deviceId = this.getDeviceId()
      if (!deviceId) { this.setData({ weekDays }); return }

      const records = await mockApi.getRecords({
        startDate: weekDays[0].date,
        endDate: weekDays[6].date
      })

      weekDays.forEach(wd => {
        const dayRecords = records.filter(r => r.date === wd.date)
        if (dayRecords.length > 0) {
          wd.hasRecords = true
          const taken = dayRecords.filter(r => r.status === 'on_time' || r.status === 'delayed' || r.status === 'early').length
          wd.rate = Math.round((taken / dayRecords.length) * 100)
        }
      })

      this.setData({ weekDays })
    } catch (e) {
      this.setData({ weekDays })
    }
  },

  async loadMonthData() {
    const { currentYear, currentMonth } = this.data
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDayOfWeek = firstDay.getDay()

    const monthDays = []
    for (let i = 0; i < startDayOfWeek; i++) {
      monthDays.push({ day: '', date: '', isCurrentMonth: false, isToday: false, rate: null, color: 'transparent' })
    }

    const now = new Date()
    const todayStr = this.formatDate(now)

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d)
      const dateStr = this.formatDate(date)
      monthDays.push({
        day: d,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        rate: null,
        color: 'transparent'
      })
    }

    try {
      const deviceId = this.getDeviceId()
      if (!deviceId) { this.setData({ monthDays, monthYear: `${currentYear}年${currentMonth + 1}月` }); return }

      const records = await mockApi.getRecords({
        startDate: this.formatDate(firstDay),
        endDate: this.formatDate(lastDay)
      })

      monthDays.forEach(md => {
        if (!md.isCurrentMonth) return
        const dayRecords = records.filter(r => r.date === md.date)
        if (dayRecords.length > 0) {
          const taken = dayRecords.filter(r => r.status === 'on_time' || r.status === 'delayed' || r.status === 'early').length
          md.rate = Math.round((taken / dayRecords.length) * 100)
          if (md.rate >= 80) md.color = 'rgba(52, 199, 89, 0.3)'
          else if (md.rate >= 50) md.color = 'rgba(52, 199, 89, 0.15)'
          else md.color = 'rgba(255, 59, 48, 0.15)'
        }
      })

      this.setData({ monthDays, monthYear: `${currentYear}年${currentMonth + 1}月` })
    } catch (e) {
      this.setData({ monthDays, monthYear: `${currentYear}年${currentMonth + 1}月` })
    }
  },

  async loadStats() {
    try {
      const deviceId = this.getDeviceId()
      if (!deviceId) return

      const weekStats = await mockApi.getComplianceStats(deviceId, 'week')
      const monthStats = await mockApi.getComplianceStats(deviceId, 'month')

      this.setData({
        stats: {
          weekRate: weekStats.complianceRate,
          monthRate: monthStats.complianceRate,
          consecutiveDays: monthStats.consecutiveDays
        }
      })
    } catch (e) {
      console.error('加载统计数据失败:', e)
    }
  },

  switchView(e) {
    const view = e.currentTarget.dataset.view
    this.setData({ currentView: view })
    if (view === 'day') this.loadDayRecords()
    else if (view === 'week') this.loadWeekData()
    else if (view === 'month') this.loadMonthData()
  },

  onStatusFilter(e) {
    this.setData({ statusFilterIndex: parseInt(e.detail.value) })
    this.loadDayRecords()
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({ selectedDate: date, currentView: 'day' })
    this.loadDayRecords()
  },

  prevMonth() {
    let { currentMonth, currentYear } = this.data
    if (currentMonth === 0) {
      this.setData({ currentMonth: 11, currentYear: currentYear - 1 })
    } else {
      this.setData({ currentMonth: currentMonth - 1 })
    }
    this.loadMonthData()
  },

  nextMonth() {
    let { currentMonth, currentYear } = this.data
    if (currentMonth === 11) {
      this.setData({ currentMonth: 0, currentYear: currentYear + 1 })
    } else {
      this.setData({ currentMonth: currentMonth + 1 })
    }
    this.loadMonthData()
  },

  generateReport() {
    wx.navigateTo({ url: '/pages/report/report' })
  },

  getDeviceId() {
    const app = getApp()
    return app.globalData.currentDeviceId || storage.getAppData().currentDeviceId
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
})
