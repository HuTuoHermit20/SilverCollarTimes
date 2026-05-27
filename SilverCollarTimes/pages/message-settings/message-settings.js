const storage = require('../../utils/storage')

Page({
  data: {
    settings: {
      medicineRemind: true,
      missedRemind: true,
      sosNotify: true,
      deviceNotify: true,
      reportNotify: false,
      dndEnabled: false,
      dndStart: '22:00',
      dndEnd: '07:00',
      wechatNotify: true,
      smsNotify: false
    }
  },

  onLoad() {
    const saved = storage.getAppData().messageSettings
    if (saved) {
      this.setData({ settings: { ...this.data.settings, ...saved } })
    }
  },

  onToggle(e) {
    const key = e.currentTarget.dataset.key
    const settings = { ...this.data.settings }
    settings[key] = e.detail.value
    this.setData({ settings })
    this.saveSettings()
  },

  onDndStartChange(e) {
    const settings = { ...this.data.settings, dndStart: e.detail.value }
    this.setData({ settings })
    this.saveSettings()
  },

  onDndEndChange(e) {
    const settings = { ...this.data.settings, dndEnd: e.detail.value }
    this.setData({ settings })
    this.saveSettings()
  },

  saveSettings() {
    storage.saveAppData({ messageSettings: this.data.settings })
  }
})
