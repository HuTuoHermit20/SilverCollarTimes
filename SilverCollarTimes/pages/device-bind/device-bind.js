const mockApi = require('../../utils/mock-api')
const storage = require('../../utils/storage')
const bluetooth = require('../../utils/bluetooth')

// 初始化全局数据监听
bluetooth.enhancedOnDataReceived()

Page({
  data: {
    devices: [],
    currentStep: 0,
    scanResult: null,
    bluetoothState: 'idle',
    foundDevices: [],
    scanDuration: 0,
    scanTimer: null,
    connectingDeviceName: '',
    connectedDeviceName: '',
    connectedDeviceId: '',
    connectedServices: [],
    connectedCharacteristics: [],
    errorMessage: ''
  },

  onShow() {
    this.loadDevices()
  },

  onUnload() {
    this.cleanup()
  },

  cleanup() {
    if (this.data.scanTimer) {
      clearInterval(this.data.scanTimer)
    }
    bluetooth.stopScan()
  },

  async loadDevices() {
    try {
      const devices = await mockApi.getDeviceList()
      this.setData({ devices })
    } catch (e) {
      console.error('加载设备列表失败:', e)
    }
  },

  startScan() {
    const that = this
    wx.scanCode({
      scanType: ['qrCode', 'barCode', 'datamatrix', 'pdf417'],
      success(res) {
        let deviceId = ''
        let deviceName = ''

        try {
          const parsed = JSON.parse(res.result)
          deviceId = parsed.deviceId || parsed.id || parsed.mac || ''
          deviceName = parsed.deviceName || parsed.name || '智能药箱'
        } catch (e) {
          const params = {}
          res.result.split('&').forEach(pair => {
            const [k, v] = pair.split('=')
            if (k && v) params[k.trim()] = decodeURIComponent(v.trim())
          })
          deviceId = params.deviceId || params.id || params.mac || res.result
          deviceName = params.deviceName || params.name || '智能药箱'
        }

        if (!deviceId) {
          wx.showToast({ title: '无效的二维码', icon: 'error' })
          return
        }

        that.setData({
          currentStep: 1,
          scanResult: { deviceId, deviceName },
          bluetoothState: 'idle',
          foundDevices: []
        })

        wx.showToast({ title: '扫码成功', icon: 'success' })
      },
      fail(err) {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '扫码失败，请重试', icon: 'error' })
        }
      }
    })
  },

  async startBluetoothScan() {
    if (!this.data.scanResult) {
      wx.showToast({ title: '请先扫描二维码', icon: 'none' })
      return
    }

    this.setData({
      currentStep: 2,
      bluetoothState: 'scanning',
      foundDevices: [],
      scanDuration: 0,
      errorMessage: ''
    })

    const timer = setInterval(() => {
      this.setData({ scanDuration: this.data.scanDuration + 1 })
    }, 1000)
    this.setData({ scanTimer: timer })

    try {
      const devices = await bluetooth.startScan({
        onDeviceFound: (device) => {
          const foundDevices = [...this.data.foundDevices]
          const exists = foundDevices.find(d => d.deviceId === device.deviceId)
          if (!exists) {
            foundDevices.push(device)
            this.setData({
              foundDevices,
              bluetoothState: 'found'
            })
          }
        },
        timeout: 15000
      })

      clearInterval(timer)
      this.setData({ scanTimer: null })

      if (devices.length === 0) {
        this.setData({ bluetoothState: 'idle' })
      }
    } catch (e) {
      clearInterval(timer)
      this.setData({
        scanTimer: null,
        bluetoothState: 'error',
        errorMessage: e.message || '蓝牙扫描失败'
      })
    }
  },

  stopBluetoothScan() {
    if (this.data.scanTimer) {
      clearInterval(this.data.scanTimer)
      this.setData({ scanTimer: null })
    }
    bluetooth.stopScan()
    this.setData({ bluetoothState: 'idle' })
  },

  async connectToDevice(e) {
    const device = e.currentTarget.dataset.device
    if (!device || !device.deviceId) return

    this.setData({
      currentStep: 2,
      bluetoothState: 'connecting',
      connectingDeviceName: device.name,
      errorMessage: ''
    })

    try {
      const channelInfo = await bluetooth.connectAndDiscover(device.deviceId, 15000)
      bluetooth.cacheDeviceInfo(device.deviceId, channelInfo)

      if (channelInfo.notifyCharId) {
        bluetooth.registerDataCallback(device.deviceId, channelInfo.notifyCharId, (data) => {
          this.handleIncomingData(device.deviceId, data.hex)
        })
      }

      bluetooth.onBLEConnectionStateChange((res) => {
        if (!res.connected && res.deviceId === device.deviceId) {
          this.setData({
            bluetoothState: 'idle',
            connectedDeviceId: '',
            connectedDeviceName: ''
          })
          wx.showToast({ title: '设备已断开', icon: 'none' })
        }
      })

      this.setData({
        currentStep: 3,
        bluetoothState: 'connected',
        connectedDeviceName: device.name,
        connectedDeviceId: device.deviceId,
        connectedServices: [{ uuid: channelInfo.serviceId }],
        connectedCharacteristics: [
          { uuid: channelInfo.writeCharId, properties: { write: true } },
          { uuid: channelInfo.notifyCharId, properties: { notify: true } }
        ]
      })
    } catch (err) {
      console.error('连接失败详情:', err)
      this.setData({
        bluetoothState: 'error',
        errorMessage: err.message || '连接失败，请检查设备'
      })
    }
  },

  handleIncomingData(deviceId, hexStr) {
    console.log('收到设备数据:', hexStr)
    const bytes = hexStr.replace(/\s/g, '').match(/.{1,2}/g)
    if (!bytes) return
    const arr = bytes.map(b => parseInt(b, 16))
    // TODO: 根据你自己的协议解析，这里仅示例
    if (arr[0] === 0xBB && arr[1] === 0x10) {
      const idLen = arr[2]
      const idBytes = arr.slice(3, 3 + idLen)
      const realDeviceId = String.fromCharCode(...idBytes)
      mockApi.bindDevice(realDeviceId, this.data.connectingDeviceName).then(() => {
        wx.showToast({ title: '设备识别成功', icon: 'success' })
        this.loadDevices()
      })
    }
  },

  async completeBinding() {
    const deviceId = this.data.connectedDeviceId
    if (!deviceId) {
      wx.showToast({ title: '请先连接设备', icon: 'error' })
      return
    }
  
    try {
      const device = await mockApi.bindDevice(deviceId, this.data.connectedDeviceName)
      wx.showToast({ title: '绑定成功', icon: 'success' })
  
      // 保存蓝牙信道信息到本地，供其他页面使用
      const cache = bluetooth.getDeviceServiceCache(deviceId)
      if (cache) {
        storage.saveAppData({
          [`ble_chars_${deviceId}`]: cache
        })
      }
  
      // 重置页面状态
      this.setData({
        currentStep: 0,
        scanResult: null,
        bluetoothState: 'idle',
        foundDevices: [],
        connectedDeviceName: '',
        connectedDeviceId: '',
        connectedServices: [],
        connectedCharacteristics: []
      })
      this.loadDevices()
    } catch (e) {
      wx.showToast({ title: e.message || '绑定失败', icon: 'error' })
    }
  },

  goDeviceDetail(e) {
    const deviceId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/device-detail/device-detail?deviceId=${deviceId}` })
  },

  unbindDevice(e) {
    const deviceId = e.currentTarget.dataset.id
    wx.showModal({
      title: '解绑设备',
      content: '请输入"解绑"确认操作',
      editable: true,
      placeholderText: '请输入解绑',
      success: async (res) => {
        if (res.confirm && res.content === '解绑') {
          try {
            await bluetooth.disconnectDevice(deviceId)
            await mockApi.unbindDevice(deviceId)
            wx.showToast({ title: '解绑成功', icon: 'success' })
            this.loadDevices()
          } catch (e) {
            wx.showToast({ title: '解绑失败', icon: 'error' })
          }
        } else if (res.confirm) {
          wx.showToast({ title: '输入不正确', icon: 'error' })
        }
      }
    })
  }
})