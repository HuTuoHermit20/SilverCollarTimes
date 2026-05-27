// pages/device-detail/device-detail.js
const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')
const bluetooth = require('../../utils/bluetooth')

Page({
  data: {
    device: null,
    remindOptions: ['不重复', '5分钟', '10分钟', '15分钟', '30分钟'],
    remindIndex: 2
  },

  onLoad(options) {
    const deviceId = options.deviceId || storage.getAppData().currentDeviceId
    if (deviceId) {
      this.loadDevice(deviceId)
    }
  },

  // 加载设备详情（从 mock 或本地）
  async loadDevice(deviceId) {
    try {
      const device = await mockApi.getDeviceDetail(deviceId)
      const remindMap = { 0: 0, 5: 1, 10: 2, 15: 3, 30: 4 }
      this.setData({
        device,
        remindIndex: remindMap[device.remindInterval] || 2
      })
    } catch (e) {
      wx.showToast({ title: '加载设备失败', icon: 'error' })
    }
  },

  // -------------------------------------------------------
  // 新增方法：获取当前设备的蓝牙通信通道（优先缓存，其次本地存储）
  async getBLECache() {
    const deviceId = this.data.device.deviceId
    let cache = bluetooth.getDeviceServiceCache(deviceId)
    if (!cache) {
      // 尝试从本地存储恢复
      const saved = storage.getAppData()
      cache = saved[`ble_chars_${deviceId}`]
      if (cache) {
        bluetooth.cacheDeviceInfo(deviceId, cache)
      }
    }
    return cache
  },

  // -------------------------------------------------------
  // 改造后的设置更新函数：先更新本地界面，再通过蓝牙下发指令
  async updateSetting(key, value) {
    // 1. 本地乐观更新（界面立即响应）
    const device = this.data.device
    try {
      await mockApi.updateDeviceSetting(device.deviceId, { [key]: value })
    } catch (e) {
      wx.showToast({ title: '本地保存失败', icon: 'none' })
    }
    device[key] = value
    this.setData({ device })

    // 2. 构造蓝牙命令并下发（根据你自己的协议修改）
    try {
      const cache = await this.getBLECache()
      if (!cache || !cache.writeCharId) {
        // 蓝牙未连接，不做任何处理，仅本地保存
        return
      }

      let cmdHex = ''
      // 根据 key 生成指令（示例，请按实际帧格式修改）
      if (key === 'volume') {
        cmdHex = `AA 03 ${('0' + value.toString(16)).slice(-2)} FF`
      } else if (key === 'remindInterval') {
        cmdHex = `AA 05 ${('0' + value.toString(16)).slice(-2)} FF`
      } else if (key === 'tempHighAlarm') {
        cmdHex = `AA 04 ${('0' + value.toString(16)).slice(-2)} FF`
      } else if (key === 'tempLowAlarm') {
        cmdHex = `AA 06 ${('0' + value.toString(16)).slice(-2)} FF`
      } else if (key === 'lowBatteryAlarm') {
        cmdHex = `AA 07 ${value ? '01' : '00'} FF`
      } else if (key === 'ledBrightness') {
        cmdHex = `AA 08 ${('0' + value.toString(16)).slice(-2)} FF`
      } else if (key === 'sosContact') {
        // 通常电话号码需要通过协议发送，这里仅示例
        cmdHex = `AA 09 ${Array.from(value).map(c => ('0' + c.charCodeAt(0).toString(16)).slice(-2)).join('')} FF`
      }

      if (cmdHex) {
        await bluetooth.sendWithCache(device.deviceId, cmdHex)
        console.log('蓝牙指令已发送:', cmdHex)
      }
    } catch (err) {
      console.warn('蓝牙指令下发失败:', err)
      wx.showToast({ title: '设备未连接，仅本地保存', icon: 'none' })
    }
  },

  // 以下是原有的事件处理函数，保持不变
  onVolumeChange(e) {
    this.updateSetting('volume', e.detail.value)
  },

  onRemindChange(e) {
    const intervals = [0, 5, 10, 15, 30]
    this.setData({ remindIndex: parseInt(e.detail.value) })
    this.updateSetting('remindInterval', intervals[e.detail.value])
  },

  onTempHighChange(e) {
    const val = parseFloat(e.detail.value)
    if (!isNaN(val)) this.updateSetting('tempHighAlarm', val)
  },

  onTempLowChange(e) {
    const val = parseFloat(e.detail.value)
    if (!isNaN(val)) this.updateSetting('tempLowAlarm', val)
  },

  onLowBatteryChange(e) {
    this.updateSetting('lowBatteryAlarm', e.detail.value)
  },

  onBrightnessChange(e) {
    this.updateSetting('ledBrightness', e.detail.value)
  },

  editSOSContact() {
    wx.showModal({
      title: '修改SOS联系人',
      editable: true,
      placeholderText: '请输入电话号码',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateSetting('sosContact', res.content.trim())
        }
      }
    })
  },

  unbindDevice() {
    wx.showModal({
      title: '解绑设备',
      content: '请输入"解绑"确认操作',
      editable: true,
      placeholderText: '请输入解绑',
      success: async (res) => {
        if (res.confirm && res.content === '解绑') {
          try {
            await bluetooth.disconnectDevice(this.data.device.deviceId)
            await mockApi.unbindDevice(this.data.device.deviceId)
            wx.showToast({ title: '解绑成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1000)
          } catch (e) {
            wx.showToast({ title: '解绑失败', icon: 'error' })
          }
        }
      }
    })
  }
})