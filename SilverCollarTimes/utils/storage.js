const STORAGE_KEYS = {
  APP_DATA: 'app_data',
  DEVICES: 'devices',
  PLANS: 'plans',
  RECORDS: 'records',
  MESSAGES: 'messages',
  TEMPLATES: 'templates'
}

function getAppData() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.APP_DATA) || {}
  } catch (e) {
    return {}
  }
}

function saveAppData(data) {
  try {
    const current = getAppData()
    const updated = { ...current, ...data }
    wx.setStorageSync(STORAGE_KEYS.APP_DATA, updated)
    return updated
  } catch (e) {
    console.error('保存应用数据失败:', e)
    return null
  }
}

function getDevices() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.DEVICES) || []
  } catch (e) {
    return []
  }
}

function saveDevices(devices) {
  try {
    wx.setStorageSync(STORAGE_KEYS.DEVICES, devices)
    return true
  } catch (e) {
    console.error('保存设备数据失败:', e)
    return false
  }
}

function addDevice(device) {
  const devices = getDevices()
  const exists = devices.find(d => d.deviceId === device.deviceId)
  if (exists) return null
  devices.push(device)
  saveDevices(devices)
  return device
}

function updateDevice(deviceId, updates) {
  const devices = getDevices()
  const index = devices.findIndex(d => d.deviceId === deviceId)
  if (index === -1) return null
  devices[index] = { ...devices[index], ...updates }
  saveDevices(devices)
  return devices[index]
}

function removeDevice(deviceId) {
  const devices = getDevices().filter(d => d.deviceId !== deviceId)
  saveDevices(devices)
  return true
}

function getPlans() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PLANS) || []
  } catch (e) {
    return []
  }
}

function savePlans(plans) {
  try {
    wx.setStorageSync(STORAGE_KEYS.PLANS, plans)
    return true
  } catch (e) {
    console.error('保存计划数据失败:', e)
    return false
  }
}

function addPlan(plan) {
  const plans = getPlans()
  plan.id = 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  plan.createdAt = new Date().toISOString()
  plans.push(plan)
  savePlans(plans)
  return plan
}

function updatePlan(planId, updates) {
  const plans = getPlans()
  const index = plans.findIndex(p => p.id === planId)
  if (index === -1) return null
  plans[index] = { ...plans[index], ...updates, updatedAt: new Date().toISOString() }
  savePlans(plans)
  return plans[index]
}

function deletePlan(planId) {
  const plans = getPlans().filter(p => p.id !== planId)
  savePlans(plans)
  return true
}

function getRecords() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.RECORDS) || []
  } catch (e) {
    return []
  }
}

function saveRecords(records) {
  try {
    wx.setStorageSync(STORAGE_KEYS.RECORDS, records)
    return true
  } catch (e) {
    console.error('保存记录数据失败:', e)
    return false
  }
}

function addRecord(record) {
  const records = getRecords()
  record.id = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  records.push(record)
  saveRecords(records)
  return record
}

function getMessages() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.MESSAGES) || []
  } catch (e) {
    return []
  }
}

function saveMessages(messages) {
  try {
    wx.setStorageSync(STORAGE_KEYS.MESSAGES, messages)
    return true
  } catch (e) {
    console.error('保存消息数据失败:', e)
    return false
  }
}

function addMessage(message) {
  const messages = getMessages()
  message.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  message.createdAt = new Date().toISOString()
  message.read = false
  messages.unshift(message)
  saveMessages(messages)
  return message
}

function markMessageRead(messageId) {
  const messages = getMessages()
  const index = messages.findIndex(m => m.id === messageId)
  if (index === -1) return null
  messages[index].read = true
  saveMessages(messages)
  return messages[index]
}

function markAllMessagesRead() {
  const messages = getMessages()
  messages.forEach(m => { m.read = true })
  saveMessages(messages)
  return true
}

function deleteMessage(messageId) {
  const messages = getMessages().filter(m => m.id !== messageId)
  saveMessages(messages)
  return true
}

function getTemplates() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.TEMPLATES) || getDefaultTemplates()
  } catch (e) {
    return getDefaultTemplates()
  }
}

function saveTemplates(templates) {
  try {
    wx.setStorageSync(STORAGE_KEYS.TEMPLATES, templates)
    return true
  } catch (e) {
    return false
  }
}

function addTemplate(template) {
  const templates = getTemplates()
  template.id = 'tpl_' + Date.now()
  templates.push(template)
  saveTemplates(templates)
  return template
}

function getDefaultTemplates() {
  return [
    {
      id: 'tpl_default_1',
      name: '降压药晨昏方案',
      medicines: [
        { name: '硝苯地平', dosage: '1', unit: '片', times: ['08:00', '20:00'], slot: 1 },
        { name: '缬沙坦', dosage: '1', unit: '片', times: ['08:00'], slot: 2 }
      ],
      repeatMode: 'daily'
    },
    {
      id: 'tpl_default_2',
      name: '降糖药三餐方案',
      medicines: [
        { name: '二甲双胍', dosage: '1', unit: '片', times: ['07:30', '12:00', '18:00'], slot: 3 }
      ],
      repeatMode: 'daily'
    },
    {
      id: 'tpl_default_3',
      name: '维生素每日一次',
      medicines: [
        { name: '维生素D', dosage: '1', unit: '粒', times: ['09:00'], slot: 4 },
        { name: '钙片', dosage: '1', unit: '片', times: ['09:00'], slot: 5 }
      ],
      repeatMode: 'daily'
    },
    {
      id: 'tpl_default_4',
      name: '心血管基础方案',
      medicines: [
        { name: '阿司匹林', dosage: '1', unit: '片', times: ['08:00'], slot: 1 },
        { name: '阿托伐他汀', dosage: '1', unit: '片', times: ['20:00'], slot: 2 }
      ],
      repeatMode: 'daily'
    }
  ]
}

function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      wx.removeStorageSync(key)
    })
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  getAppData,
  saveAppData,
  getDevices,
  saveDevices,
  addDevice,
  updateDevice,
  removeDevice,
  getPlans,
  savePlans,
  addPlan,
  updatePlan,
  deletePlan,
  getRecords,
  saveRecords,
  addRecord,
  getMessages,
  saveMessages,
  addMessage,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage,
  getTemplates,
  saveTemplates,
  addTemplate,
  clearAllData
}
