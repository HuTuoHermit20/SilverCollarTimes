const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

Page({
  data: {
    calendarDays: [],
    selectedDate: '',
    plans: []
  },

  onLoad() {
    const now = new Date()
    this.setData({ selectedDate: this.formatDate(now) })
    this.buildCalendar()
  },

  onShow() {
    this.loadPlans()
  },

  buildCalendar() {
    const now = new Date()
    const days = []
    for (let i = -3; i <= 10; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const dateStr = this.formatDate(d)
      days.push({
        date: dateStr,
        dayName: WEEKDAYS_SHORT[d.getDay()],
        day: d.getDate(),
        isToday: dateStr === this.formatDate(now),
        hasPlan: false,
        dotColor: 'gray'
      })
    }
    this.setData({ calendarDays: days })
    this.updateCalendarDots()
  },

  async updateCalendarDots() {
    const deviceId = this.getDeviceId()
    if (!deviceId) return

    try {
      const allPlans = storage.getPlans().filter(p => p.deviceId === deviceId)
      const calendarDays = this.data.calendarDays.map(day => {
        const dayPlans = allPlans.filter(p => {
          return this.isPlanActiveOnDate(p, day.date)
        })
        if (dayPlans.length > 0) {
          day.hasPlan = true
          const records = storage.getRecords().filter(r =>
            r.date === day.date && dayPlans.some(p => p.id === r.planId)
          )
          const allDone = dayPlans.every(p =>
            records.some(r => r.planId === p.id && (r.status === 'on_time' || r.status === 'delayed' || r.status === 'early'))
          )
          const hasMissed = records.some(r => r.status === 'missed')
          if (allDone) day.dotColor = 'green'
          else if (hasMissed) day.dotColor = 'orange'
          else day.dotColor = 'gray'
        }
        return day
      })
      this.setData({ calendarDays })
    } catch (e) {
      console.error('更新日历标记失败:', e)
    }
  },

  async loadPlans() {
    try {
      const deviceId = this.getDeviceId()
      if (!deviceId) return

      const plans = await mockApi.getPlansByDate(deviceId, this.data.selectedDate)
      const records = storage.getRecords().filter(r => r.date === this.data.selectedDate)

      const formatted = plans.map(p => {
        const record = records.find(r => r.planId === p.id)
        let statusText = '等待'
        let statusTag = 'tag-default'
        if (record) {
          if (record.status === 'on_time' || record.status === 'early') { statusText = '已完成'; statusTag = 'tag-success' }
          else if (record.status === 'delayed') { statusText = '延迟'; statusTag = 'tag-warning' }
          else if (record.status === 'missed') { statusText = '已过期未服'; statusTag = 'tag-danger' }
          else if (record.status === 'skipped') { statusText = '已跳过'; statusTag = 'tag-default' }
        }
        return { ...p, statusText, statusTag }
      })

      this.setData({ plans: formatted })
    } catch (e) {
      console.error('加载计划失败:', e)
    }
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date })
    this.loadPlans()
  },

  addPlan() {
    wx.navigateTo({ url: '/pages/plan-form/plan-form' })
  },

  editPlan(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/plan-form/plan-form?planId=${id}` })
  },

  deletePlan(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除计划',
      content: '确定要删除这个用药计划吗？',
      success: async (res) => {
        if (res.confirm) {
          await mockApi.deletePlanItem(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadPlans()
        }
      }
    })
  },

  openTemplates() {
    const templates = storage.getTemplates()
    const names = templates.map(t => t.name)
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const template = templates[res.tapIndex]
        wx.navigateTo({ url: `/pages/plan-form/plan-form?templateId=${template.id}` })
      }
    })
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
  },

  isPlanActiveOnDate(plan, date) {
    if (!plan.repeatMode || plan.repeatMode === 'daily') return true
    if (plan.repeatMode === 'weekly' && plan.weekDays) {
      const d = new Date(date)
      const dayOfWeek = d.getDay() || 7
      return plan.weekDays.includes(dayOfWeek)
    }
    return true
  }
})
