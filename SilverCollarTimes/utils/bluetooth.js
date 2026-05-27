var isScanning = false
var connectedDeviceId = null
var isAdapterOpen = false
var scanListenerRegistered = false
var connectionStateListenerRegistered = false
var dataListenerRegistered = false

var adapterStateChangeCb = null
var deviceFoundCb = null
var connectionStateChangeCb = null
var dataReceivedCb = null

function ab2str(buffer) {
  var arr = Array.from(new Uint8Array(buffer))
  return arr.map(function (byte) { return String.fromCharCode(byte) }).join('')
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length)
  var bufView = new Uint8Array(buf)
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

function ab2hex(buffer) {
  var arr = Array.from(new Uint8Array(buffer))
  return arr.map(function (b) { return ('00' + b.toString(16)).slice(-2).toUpperCase() }).join(' ')
}

function hex2ab(hex) {
  var str = hex.replace(/\s/g, '')
  var buf = new ArrayBuffer(str.length / 2)
  var bufView = new Uint8Array(buf)
  for (var i = 0; i < str.length; i += 2) {
    bufView[i / 2] = parseInt(str.substr(i, 2), 16)
  }
  return buf
}

function uuid16To128(uuid16) {
  return '0000' + uuid16.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
}

function uuid32To128(uuid32) {
  return uuid32.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
}

function normalizeUUID(uuid) {
  if (!uuid) return ''
  uuid = uuid.toUpperCase()
  if (uuid.length === 4) return uuid16To128(uuid)
  if (uuid.length === 8) return uuid32To128(uuid)
  return uuid
}

function initBluetooth() {
  return new Promise(function (resolve, reject) {
    if (isAdapterOpen) {
      resolve()
      return
    }

    wx.openBluetoothAdapter({
      mode: 'central',
      success: function () {
        isAdapterOpen = true
        resolve()
      },
      fail: function (err) {
        if (err.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            if (adapterStateChangeCb) adapterStateChangeCb(res)
            if (res.available && !isAdapterOpen) {
              isAdapterOpen = true
            }
          })
          reject(new Error('请打开手机蓝牙'))
        } else if (err.errCode === 10005) {
          reject(new Error('当前设备不支持蓝牙功能'))
        } else {
          reject(new Error('蓝牙初始化失败: ' + (err.errMsg || err.message || '未知错误')))
        }
      }
    })
  })
}

function onBluetoothAdapterStateChange(callback) {
  adapterStateChangeCb = callback
  wx.onBluetoothAdapterStateChange(function (res) {
    if (callback) callback(res)
  })
}

function startScan(options) {
  return new Promise(function (resolve, reject) {
    if (isScanning) {
      reject(new Error('正在扫描中，请先停止当前扫描'))
      return
    }

    var opts = options || {}
    var onDeviceFound = opts.onDeviceFound || null
    var timeout = opts.timeout || 15000
    var services = opts.services || []
    var allowDuplicates = opts.allowDuplicates || false
    var deviceNameFilter = opts.deviceNameFilter || ''

    initBluetooth().then(function () {
      isScanning = true
      var foundDevices = []

      if (!scanListenerRegistered) {
        scanListenerRegistered = true
        wx.onBluetoothDeviceFound(function (res) {
          res.devices.forEach(function (device) {
            if (deviceNameFilter && device.name && device.localName) {
              var dn = (device.localName || device.name || '').toLowerCase()
              if (dn.indexOf(deviceNameFilter.toLowerCase()) === -1) return
            }

            var exists = foundDevices.find(function (d) { return d.deviceId === device.deviceId })
            if (!exists) {
              foundDevices.push(device)
              if (onDeviceFound) {
                onDeviceFound({
                  deviceId: device.deviceId,
                  name: device.localName || device.name || '未知设备',
                  RSSI: device.RSSI,
                  advertisData: device.advertisData,
                  advertisServiceUUIDs: device.advertisServiceUUIDs || []
                })
              }
            }
          })
        })
      }

      var discoveryParams = {
        allowDuplicatesKey: allowDuplicates
      }

      if (services && services.length > 0) {
        discoveryParams.services = services.map(function (s) { return normalizeUUID(s) })
      }

      wx.startBluetoothDevicesDiscovery({
        ...discoveryParams,
        success: function () {
          setTimeout(function () {
            stopScan()
            resolve(foundDevices)
          }, timeout)
        },
        fail: function (err) {
          isScanning = false
          reject(new Error('启动扫描失败: ' + (err.errMsg || err.message || '未知错误')))
        }
      })
    }).catch(reject)
  })
}

function stopScan() {
  if (!isScanning) return
  isScanning = false
  wx.stopBluetoothDevicesDiscovery()
}

function getConnectedDevices(services) {
  return new Promise(function (resolve, reject) {
    var params = {}
    if (services && services.length > 0) {
      params.services = services.map(function (s) { return normalizeUUID(s) })
    }
    wx.getConnectedBluetoothDevices({
      ...params,
      success: function (res) {
        resolve(res.devices || [])
      },
      fail: function (err) {
        reject(new Error('获取已连接设备失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function connectDevice(deviceId, timeout) {
  return new Promise(function (resolve, reject) {
    var t = timeout || 10000
    var timer = setTimeout(function () {
      reject(new Error('连接超时，请确认设备在附近且未被其他设备连接'))
    }, t)

    if (!connectionStateListenerRegistered) {
      connectionStateListenerRegistered = true
      wx.onBLEConnectionStateChange(function (res) {
        if (connectionStateChangeCb) connectionStateChangeCb(res)
        if (!res.connected && res.deviceId === connectedDeviceId) {
          connectedDeviceId = null
        }
      })
    }

    wx.createBLEConnection({
      deviceId: deviceId,
      timeout: t,
      success: function () {
        clearTimeout(timer)
        connectedDeviceId = deviceId
        resolve()
      },
      fail: function (err) {
        clearTimeout(timer)
        if (err.errCode === 10003) {
          reject(new Error('设备连接失败，请靠近设备后重试'))
        } else if (err.errCode === 10012) {
          reject(new Error('连接超时，请确认设备已开启'))
        } else {
          reject(new Error('连接失败: ' + (err.errMsg || err.message || '未知错误')))
        }
      }
    })
  })
}

function onBLEConnectionStateChange(callback) {
  connectionStateChangeCb = callback
  if (!connectionStateListenerRegistered) {
    connectionStateListenerRegistered = true
    wx.onBLEConnectionStateChange(function (res) {
      if (callback) callback(res)
      if (!res.connected && res.deviceId === connectedDeviceId) {
        connectedDeviceId = null
      }
    })
  }
}

function setMTU(deviceId, mtu) {
  return new Promise(function (resolve, reject) {
    wx.setBLEMTU({
      deviceId: deviceId,
      mtu: mtu || 500,
      success: function (res) {
        resolve(res.mtu)
      },
      fail: function (err) {
        resolve(20)
      }
    })
  })
}

function getBLEDeviceRSSI(deviceId) {
  return new Promise(function (resolve, reject) {
    wx.getBLEDeviceRSSI({
      deviceId: deviceId,
      success: function (res) {
        resolve(res.RSSI)
      },
      fail: function (err) {
        reject(new Error('获取信号强度失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function getDeviceServices(deviceId) {
  return new Promise(function (resolve, reject) {
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: function (res) {
        var services = (res.services || []).map(function (s) {
          return {
            uuid: s.uuid,
            isPrimary: s.isPrimary
          }
        })
        resolve(services)
      },
      fail: function (err) {
        reject(new Error('获取服务列表失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function getCharacteristics(deviceId, serviceId) {
  return new Promise(function (resolve, reject) {
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function (res) {
        var characteristics = (res.characteristics || []).map(function (c) {
          return {
            uuid: c.uuid,
            properties: {
              read: c.properties.read || false,
              write: c.properties.write || false,
              notify: c.properties.notify || false,
              indicate: c.properties.indicate || false,
              writeNoResponse: c.properties.writeNoResponse || false
            }
          }
        })
        resolve(characteristics)
      },
      fail: function (err) {
        reject(new Error('获取特征值列表失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function readCharacteristic(deviceId, serviceId, characteristicId) {
  return new Promise(function (resolve, reject) {
    wx.readBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      success: function () {
        resolve()
      },
      fail: function (err) {
        reject(new Error('读取特征值失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function writeCharacteristic(deviceId, serviceId, characteristicId, value) {
  return new Promise(function (resolve, reject) {
    var buffer
    if (typeof value === 'string') {
      buffer = str2ab(value)
    } else if (value instanceof ArrayBuffer) {
      buffer = value
    } else {
      reject(new Error('数据格式不支持，请传入字符串或ArrayBuffer'))
      return
    }

    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: buffer,
      success: function () {
        resolve()
      },
      fail: function (err) {
        reject(new Error('写入特征值失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function writeHex(deviceId, serviceId, characteristicId, hexStr) {
  var buffer = hex2ab(hexStr)
  return writeCharacteristic(deviceId, serviceId, characteristicId, buffer)
}

function enableNotify(deviceId, serviceId, characteristicId) {
  return new Promise(function (resolve, reject) {
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      state: true,
      success: function () {
        resolve()
      },
      fail: function (err) {
        reject(new Error('启用通知失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function disableNotify(deviceId, serviceId, characteristicId) {
  return new Promise(function (resolve, reject) {
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      state: false,
      success: function () {
        resolve()
      },
      fail: function (err) {
        reject(new Error('关闭通知失败: ' + (err.errMsg || err.message || '未知错误')))
      }
    })
  })
}

function onDataReceived(callback) {
  dataReceivedCb = callback
  if (!dataListenerRegistered) {
    dataListenerRegistered = true
    wx.onBLECharacteristicValueChange(function (res) {
      if (callback) {
        callback({
          deviceId: res.deviceId,
          serviceId: res.serviceId,
          characteristicId: res.characteristicId,
          value: res.value,
          valueStr: ab2str(res.value),
          valueHex: ab2hex(res.value)
        })
      }
    })
  }
}

function sendData(deviceId, serviceId, characteristicId, data) {
  return writeCharacteristic(deviceId, serviceId, characteristicId, data)
}

function disconnectDevice(deviceId) {
  return new Promise(function (resolve) {
    if (!deviceId) {
      resolve()
      return
    }
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: function () {
        connectedDeviceId = null
        resolve()
      },
      fail: function () {
        connectedDeviceId = null
        resolve()
      }
    })
  })
}

function closeBluetooth() {
  isScanning = false
  connectedDeviceId = null
  isAdapterOpen = false
  scanListenerRegistered = false
  connectionStateListenerRegistered = false
  dataListenerRegistered = false
  adapterStateChangeCb = null
  deviceFoundCb = null
  connectionStateChangeCb = null
  dataReceivedCb = null
  wx.closeBluetoothAdapter({
    success: function () {},
    fail: function () {}
  })
}

function getConnectedDeviceId() {
  return connectedDeviceId
}

function isBluetoothOpen() {
  return isAdapterOpen
}

// 延迟辅助函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 连接设备并自动发现读写通知特征
 * @param {string} deviceId 
 * @param {number} timeout 
 * @returns {Promise<{serviceId, writeCharId, notifyCharId, mtu}>}
 */
async function connectAndDiscover(deviceId, timeout = 15000) {
  await connectDevice(deviceId, timeout)
  
  // 等待蓝牙协议栈稳定（某些安卓机器需要）
  await delay(500)
  
  const mtu = await setMTU(deviceId, 500).catch(() => 20)
  
  const services = await getDeviceServices(deviceId)
  if (!services || services.length === 0) {
    throw new Error('未发现任何蓝牙服务，请确认设备固件')
  }
  
  // 遍历所有服务（不区分 isPrimary）
  for (const service of services) {
    try {
      const characteristics = await getCharacteristics(deviceId, service.uuid)
      
      let writeChar = null
      let notifyChar = null
      
      // 在特征中寻找 write 与 notify 属性，并且 UUID 符合候选
      for (const char of characteristics) {
        const props = char.properties
        // 优先使用你在配置里指定的 UUID 匹配
        if (props.write || props.writeNoResponse) {
          if (!writeChar) writeChar = char
        }
        if (props.notify || props.indicate) {
          if (!notifyChar) notifyChar = char
        }
      }
      
      // 如果当前服务同时找到了读/写/通知，或至少找到了写，就采用这个服务
      if (writeChar || notifyChar) {
        // 启用通知（如有）
        if (notifyChar) {
          await enableNotify(deviceId, service.uuid, notifyChar.uuid).catch(() => {
            console.warn('启用通知失败，可能无需通知')
          })
        }
        
        return {
          serviceId: service.uuid,
          writeCharId: writeChar ? writeChar.uuid : null,
          notifyCharId: notifyChar ? notifyChar.uuid : null,
          mtu
        }
      }
    } catch (e) {
      console.warn('获取特征失败，跳过服务:', service.uuid, e)
    }
  }
  
  throw new Error('在已发现的服务中未找到可用的写或通知特征，请检查设备固件')
}

// 使用缓存的通道发送数据（带分包）
async function sendWithCache(deviceId, value) {
  const cache = getDeviceServiceCache(deviceId)
  if (!cache || !cache.writeCharId) throw new Error('设备写特征未就绪')
  
  let buffer
  if (typeof value === 'string') {
    buffer = str2ab(value)
  } else if (value instanceof ArrayBuffer) {
    buffer = value
  } else {
    throw new Error('数据格式不支持')
  }
  
  const mtu = cache.mtu || 20
  const chunkSize = Math.max(20, mtu - 3)
  const chunks = []
  for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
    chunks.push(buffer.slice(offset, offset + chunkSize))
  }
  
  for (const chunk of chunks) {
    await writeCharacteristic(deviceId, cache.serviceId, cache.writeCharId, chunk)
  }
}

// 缓存服务信息
const deviceServiceCache = {}

function cacheDeviceInfo(deviceId, info) {
  deviceServiceCache[deviceId] = info
}

function getDeviceServiceCache(deviceId) {
  return deviceServiceCache[deviceId]
}

// 注册设备数据回调
const dataCallbacks = {}

function registerDataCallback(deviceId, characteristicId, callback) {
  const key = `${deviceId}_${characteristicId}`
  dataCallbacks[key] = callback
}

// 修改全局 onDataReceived，将数据分发给已注册的回调
function enhancedOnDataReceived() {
  if (!dataListenerRegistered) {
    dataListenerRegistered = true
    wx.onBLECharacteristicValueChange(function (res) {
      const key = `${res.deviceId}_${res.characteristicId}`
      const cb = dataCallbacks[key]
      if (cb) {
        cb({
          deviceId: res.deviceId,
          serviceId: res.serviceId,
          characteristicId: res.characteristicId,
          value: res.value,
          hex: ab2hex(res.value),
          str: ab2str(res.value)
        })
      }
      // 保留原来的全局回调（如果有其他地方使用）
      if (dataReceivedCb) {
        dataReceivedCb({
          deviceId: res.deviceId,
          serviceId: res.serviceId,
          characteristicId: res.characteristicId,
          value: res.value,
          valueStr: ab2str(res.value),
          valueHex: ab2hex(res.value)
        })
      }
    })
  }
}

module.exports = {
  initBluetooth,
  onBluetoothAdapterStateChange,
  startScan,
  stopScan,
  getConnectedDevices,
  connectDevice,
  onBLEConnectionStateChange,
  setMTU,
  getBLEDeviceRSSI,
  getDeviceServices,
  getCharacteristics,
  readCharacteristic,
  writeCharacteristic,
  writeHex,
  enableNotify,
  disableNotify,
  onDataReceived,
  sendData,
  disconnectDevice,
  closeBluetooth,
  getConnectedDeviceId,
  isBluetoothOpen,
  uuid16To128,
  uuid32To128,
  normalizeUUID,
  ab2str,
  str2ab,
  ab2hex,
  hex2ab,
  connectAndDiscover,
  sendWithCache,
  cacheDeviceInfo,
  getDeviceServiceCache,
  registerDataCallback,
  enhancedOnDataReceived,
  delay
}
