const mockApi = require('../../utils/mock-api')

Page({
  data: {
    report: {
      period: '',
      overallRate: 0,
      onTimeCount: 0,
      delayedCount: 0,
      missedCount: 0,
      trends: [],
      suggestions: []
    }
  },

  onLoad() {
    this.generateReport()
  },

  async generateReport() {
    try {
      const report = await mockApi.generateReport()
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      report.period = `${y}年${m}月`

      const total = report.onTimeCount + report.delayedCount + report.missedCount
      report.overallRate = total > 0 ? Math.round((report.onTimeCount + report.delayedCount) / total * 100) : 0

      report.trends = [
        { label: '第1周', value: 92, color: '#34C759' },
        { label: '第2周', value: 88, color: '#34C759' },
        { label: '第3周', value: 85, color: '#FF9500' },
        { label: '第4周', value: report.overallRate, color: report.overallRate >= 90 ? '#34C759' : '#FF9500' }
      ]

      report.suggestions = [
        '本周依从率良好，请继续保持',
        '建议在饭前半小时提醒服药，提高准时率',
        '可考虑设置重复提醒，减少漏服风险'
      ]

      this.setData({ report })
    } catch (e) {
      console.error('生成报告失败:', e)
    }
  },

  shareReport() {
    wx.showToast({ title: '报告已生成，可分享给家人', icon: 'success' })
  }
})
