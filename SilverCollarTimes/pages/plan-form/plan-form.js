const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')

Page({
  data: {
    isEdit: false,
    editPlanId: null,
    form: {
      medicineName: '',
      dosage: '',
      unit: '片',
      slot: 1,
      times: ['08:00'],
      repeatMode: 'daily',
      weekDays: [],
      note: '',
      advanceMinutes: 0
    },
    unitOptions: ['片', '粒', '包', 'ml', '滴', '格'],
    unitIndex: 0,
    slotOptions: [],
    repeatOptions: ['每天', '每周', '间隔N天', '自定义日期范围'],
    repeatIndex: 0,
    advanceOptions: ['准点', '提前5分钟', '提前10分钟', '提前15分钟'],
    advanceIndex: 0
  },

  onLoad(options) {
    const slotOptions = []
    for (let i = 1; i <= 14; i++) slotOptions.push(`药格 #${i}`)
    this.setData({ slotOptions })

    if (options.planId) {
      this.loadPlan(options.planId)
    } else if (options.templateId) {
      this.loadTemplate(options.templateId)
    }
  },

  loadPlan(planId) {
    const plans = storage.getPlans()
    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    const repeatMap = { 'daily': 0, 'weekly': 1, 'interval': 2, 'range': 3 }
    const unitMap = { '片': 0, '粒': 1, '包': 2, 'ml': 3, '滴': 4, '格': 5 }
    const advanceMap = { 0: 0, 5: 1, 10: 2, 15: 3 }

    this.setData({
      isEdit: true,
      editPlanId: planId,
      form: {
        medicineName: plan.medicineName || '',
        dosage: plan.dosage || '',
        unit: plan.unit || '片',
        slot: plan.slot || 1,
        times: plan.times || ['08:00'],
        repeatMode: plan.repeatMode || 'daily',
        weekDays: plan.weekDays || [],
        note: plan.note || '',
        advanceMinutes: plan.advanceMinutes || 0
      },
      unitIndex: unitMap[plan.unit] || 0,
      repeatIndex: repeatMap[plan.repeatMode] || 0,
      advanceIndex: advanceMap[plan.advanceMinutes] || 0
    })
  },

  loadTemplate(templateId) {
    const templates = storage.getTemplates()
    const template = templates.find(t => t.id === templateId)
    if (!template || !template.medicines || template.medicines.length === 0) return

    const med = template.medicines[0]
    const unitMap = { '片': 0, '粒': 1, '包': 2, 'ml': 3, '滴': 4, '格': 5 }
    const repeatMap = { 'daily': 0, 'weekly': 1, 'interval': 2, 'range': 3 }

    this.setData({
      form: {
        ...this.data.form,
        medicineName: med.name || '',
        dosage: med.dosage || '',
        unit: med.unit || '片',
        slot: med.slot || 1,
        times: med.times || ['08:00'],
        repeatMode: template.repeatMode || 'daily'
      },
      unitIndex: unitMap[med.unit] || 0,
      repeatIndex: repeatMap[template.repeatMode] || 0
    })
  },

  onFieldChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
  },

  onUnitChange(e) {
    const units = this.data.unitOptions
    this.setData({
      unitIndex: parseInt(e.detail.value),
      'form.unit': units[e.detail.value]
    })
  },

  onSlotChange(e) {
    this.setData({ 'form.slot': parseInt(e.detail.value) + 1 })
  },

  onTimeChange(e) {
    const index = e.currentTarget.dataset.index
    const times = [...this.data.form.times]
    times[index] = e.detail.value
    this.setData({ 'form.times': times })
  },

  addTime() {
    const times = [...this.data.form.times, '12:00']
    this.setData({ 'form.times': times })
  },

  removeTime(e) {
    const index = e.currentTarget.dataset.index
    const times = this.data.form.times.filter((_, i) => i !== index)
    this.setData({ 'form.times': times })
  },

  onRepeatChange(e) {
    const modes = ['daily', 'weekly', 'interval', 'range']
    this.setData({
      repeatIndex: parseInt(e.detail.value),
      'form.repeatMode': modes[e.detail.value]
    })
  },

  toggleWeekDay(e) {
    const day = e.currentTarget.dataset.day
    let weekDays = [...this.data.form.weekDays]
    const idx = weekDays.indexOf(day)
    if (idx > -1) {
      weekDays = weekDays.filter(d => d !== day)
    } else {
      weekDays.push(day)
    }
    this.setData({ 'form.weekDays': weekDays })
  },

  onAdvanceChange(e) {
    const minutes = [0, 5, 10, 15]
    this.setData({
      advanceIndex: parseInt(e.detail.value),
      'form.advanceMinutes': minutes[e.detail.value]
    })
  },

  async savePlan() {
    const form = this.data.form
    if (!form.medicineName || form.medicineName.length < 2) {
      wx.showToast({ title: '药品名称需2-20字', icon: 'error' })
      return
    }
    if (!form.dosage || isNaN(form.dosage)) {
      wx.showToast({ title: '请填写有效剂量', icon: 'error' })
      return
    }
    if (!form.slot) {
      wx.showToast({ title: '请选择药格', icon: 'error' })
      return
    }

    const deviceId = storage.getAppData().currentDeviceId || 'DEV_DEMO_001'
    const planData = { ...form, deviceId }

    try {
      if (this.data.isEdit) {
        await mockApi.updatePlanItem(this.data.editPlanId, planData)
        wx.showToast({ title: '计划已更新', icon: 'success' })
      } else {
        await mockApi.savePlan(planData)
        wx.showToast({ title: '计划已保存', icon: 'success' })
      }
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'error' })
    }
  },

  saveAsTemplate() {
    wx.showModal({
      title: '保存为模板',
      editable: true,
      placeholderText: '请输入模板名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const template = {
            name: res.content.trim(),
            medicines: [{
              name: this.data.form.medicineName,
              dosage: this.data.form.dosage,
              unit: this.data.form.unit,
              times: this.data.form.times,
              slot: this.data.form.slot
            }],
            repeatMode: this.data.form.repeatMode
          }
          storage.addTemplate(template)
          wx.showToast({ title: '模板已保存', icon: 'success' })
        }
      }
    })
  }
})
