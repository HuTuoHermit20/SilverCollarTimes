const storage = require('./storage')

const MOCK_DELAY_MIN = 300
const MOCK_DELAY_MAX = 500

function delay() {
  const ms = Math.floor(Math.random() * (MOCK_DELAY_MAX - MOCK_DELAY_MIN + 1)) + MOCK_DELAY_MIN
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateDeviceId() {
  return 'DEV_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase()
}

function createDefaultDevice(deviceId, name) {
  return {
    deviceId: deviceId || generateDeviceId(),
    name: name || '智能药箱',
    online: true,
    battery: 85,
    temperature: 26,
    humidity: 58,
    volume: 70,
    remindInterval: 10,
    tempHighAlarm: 35,
    tempLowAlarm: 10,
    humidityHighAlarm: 80,
    humidityLowAlarm: 20,
    lowBatteryAlarm: true,
    ledBrightness: 80,
    sosContact: '13800138000',
    firmwareVersion: 'v1.2.3',
    hasUpdate: false,
    bindTime: new Date().toISOString(),
    medicineSlots: 14,
    slotAssignments: {}
  }
}

async function bindDevice(deviceId, deviceName) {
  await delay()
  const devices = storage.getDevices()
  if (devices.find(d => d.deviceId === deviceId)) {
    throw new Error('设备已绑定')
  }
  const name = deviceName || '妈妈的药箱'
  const device = createDefaultDevice(deviceId, name)
  storage.addDevice(device)
  storage.saveAppData({ currentDeviceId: deviceId })
  return device
}

async function getDeviceList() {
  await delay()
  return storage.getDevices()
}

async function getDeviceDetail(deviceId) {
  await delay()
  const devices = storage.getDevices()
  const device = devices.find(d => d.deviceId === deviceId)
  if (!device) throw new Error('设备不存在')
  return device
}

async function updateDeviceSetting(deviceId, settings) {
  await delay()
  const device = storage.updateDevice(deviceId, settings)
  if (!device) throw new Error('设备不存在')
  return device
}

async function unbindDevice(deviceId) {
  await delay()
  storage.removeDevice(deviceId)
  const appData = storage.getAppData()
  if (appData.currentDeviceId === deviceId) {
    const devices = storage.getDevices()
    storage.saveAppData({ currentDeviceId: devices.length > 0 ? devices[0].deviceId : null })
  }
  return true
}

async function getTodayPlan(deviceId) {
  await delay()
  const plans = storage.getPlans()
  const today = formatDate(new Date())
  return plans.filter(p => p.deviceId === deviceId && isPlanActiveToday(p, today))
}

async function getPlansByDate(deviceId, date) {
  await delay()
  const plans = storage.getPlans()
  return plans.filter(p => p.deviceId === deviceId && isPlanActiveOnDate(p, date))
}

async function savePlan(planData) {
  await delay()
  validatePlan(planData)
  const plan = storage.addPlan(planData)
  return plan
}

async function updatePlanItem(planId, planData) {
  await delay()
  validatePlan(planData)
  const plan = storage.updatePlan(planId, planData)
  if (!plan) throw new Error('计划不存在')
  return plan
}

async function deletePlanItem(planId) {
  await delay()
  storage.deletePlan(planId)
  return true
}

async function getRecords(dateRange) {
  await delay()
  const records = storage.getRecords()
  if (!dateRange) return records

  const { startDate, endDate } = dateRange
  return records.filter(r => {
    const recordDate = r.date || r.plannedTime.split('T')[0]
    return recordDate >= startDate && recordDate <= endDate
  })
}

async function addMedicationRecord(recordData) {
  await delay()
  const record = storage.addRecord(recordData)
  return record
}

async function getMessages(options = {}) {
  await delay()
  let messages = storage.getMessages()
  if (options.type === 'urgent') {
    messages = messages.filter(m => m.category === 'sos' && !m.handled)
  }
  if (options.limit) {
    messages = messages.slice(0, options.limit)
  }
  return messages
}

async function markMessageRead(messageId) {
  await delay()
  return storage.markMessageRead(messageId)
}

async function markAllMessagesRead() {
  await delay()
  return storage.markAllMessagesRead()
}

async function deleteMessageItem(messageId) {
  await delay()
  return storage.deleteMessage(messageId)
}

async function triggerSOS(deviceId) {
  await delay()
  const message = storage.addMessage({
    type: 'sos',
    category: 'sos',
    title: '紧急求助',
    content: '妈妈发出了紧急求助！请立即查看并联系确认。',
    deviceId: deviceId,
    handled: false,
    icon: 'sos'
  })
  return message
}

async function simulateMedicationTaken(planId) {
  await delay()
  const plans = storage.getPlans()
  const plan = plans.find(p => p.id === planId)
  if (!plan) throw new Error('计划不存在')

  const now = new Date()
  const plannedTime = plan.times[0]
  const [h, m] = plannedTime.split(':')
  const plannedDate = new Date(now)
  plannedDate.setHours(parseInt(h), parseInt(m), 0, 0)

  const diffMinutes = Math.round((now.getTime() - plannedDate.getTime()) / 60000)
  let status = 'on_time'
  if (diffMinutes > 15) status = 'delayed'
  if (diffMinutes < -5) status = 'early'

  const record = storage.addRecord({
    planId: plan.id,
    deviceId: plan.deviceId,
    medicineName: plan.medicineName,
    dosage: plan.dosage,
    unit: plan.unit,
    slot: plan.slot,
    plannedTime: plannedDate.toISOString(),
    actualTime: now.toISOString(),
    date: formatDate(now),
    status: status,
    delayMinutes: diffMinutes > 0 ? diffMinutes : 0,
    isSupplement: false,
    temperature: 26,
    humidity: 58
  })

  const statusText = status === 'on_time' ? '准时' : status === 'delayed' ? `延迟${diffMinutes}分钟` : '提前'
  storage.addMessage({
    type: 'medication',
    category: 'normal',
    title: '服药通知',
    content: `${plan.medicineName} ${plan.dosage}${plan.unit} 已${statusText}服用`,
    deviceId: plan.deviceId,
    icon: 'medicine'
  })

  return record
}

async function simulateMissedDose(planId) {
  await delay()
  const plans = storage.getPlans()
  const plan = plans.find(p => p.id === planId)
  if (!plan) throw new Error('计划不存在')

  const now = new Date()
  const plannedTime = plan.times[0]
  const [h, m] = plannedTime.split(':')
  const plannedDate = new Date(now)
  plannedDate.setHours(parseInt(h), parseInt(m), 0, 0)

  const record = storage.addRecord({
    planId: plan.id,
    deviceId: plan.deviceId,
    medicineName: plan.medicineName,
    dosage: plan.dosage,
    unit: plan.unit,
    slot: plan.slot,
    plannedTime: plannedDate.toISOString(),
    actualTime: null,
    date: formatDate(now),
    status: 'missed',
    delayMinutes: 0,
    isSupplement: false
  })

  storage.addMessage({
    type: 'missed',
    category: 'normal',
    title: '漏服提醒',
    content: `${plan.medicineName} ${plan.dosage}${plan.unit} 未按时服用，请关注`,
    deviceId: plan.deviceId,
    icon: 'missed'
  })

  return record
}

async function getTemplates() {
  await delay()
  return storage.getTemplates()
}

async function saveTemplate(templateData) {
  await delay()
  return storage.addTemplate(templateData)
}

async function getComplianceStats(deviceId, period) {
  await delay()
  const records = storage.getRecords().filter(r => r.deviceId === deviceId)
  const now = new Date()

  let startDate
  if (period === 'week') {
    const dayOfWeek = now.getDay() || 7
    startDate = new Date(now)
    startDate.setDate(now.getDate() - dayOfWeek + 1)
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const startStr = formatDate(startDate)
  const endStr = formatDate(now)

  const periodRecords = records.filter(r => r.date >= startStr && r.date <= endStr)
  const total = periodRecords.length
  const onTime = periodRecords.filter(r => r.status === 'on_time').length
  const delayed = periodRecords.filter(r => r.status === 'delayed').length
  const missed = periodRecords.filter(r => r.status === 'missed').length
  const skipped = periodRecords.filter(r => r.status === 'skipped').length

  const complianceRate = total > 0 ? Math.round(((onTime + delayed) / total) * 100) : 100

  let consecutiveDays = 0
  const sortedRecords = records
    .filter(r => r.status === 'on_time' || r.status === 'delayed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const uniqueDays = [...new Set(sortedRecords.map(r => r.date))].sort().reverse()
  const today = formatDate(now)
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(now)
    expected.setDate(now.getDate() - i)
    if (uniqueDays[i] === formatDate(expected)) {
      consecutiveDays++
    } else {
      break
    }
  }

  return {
    total,
    onTime,
    delayed,
    missed,
    skipped,
    complianceRate,
    consecutiveDays,
    period
  }
}

function validatePlan(planData) {
  if (!planData.medicineName || planData.medicineName.length < 2 || planData.medicineName.length > 20) {
    throw new Error('药品名称需2-20字')
  }
  if (!planData.dosage || isNaN(planData.dosage)) {
    throw new Error('请填写有效剂量')
  }
  if (!planData.slot || planData.slot < 1 || planData.slot > 14) {
    throw new Error('请选择有效药格(1-14)')
  }
  if (!planData.times || planData.times.length === 0) {
    throw new Error('请至少设置一个用药时间')
  }

  const plans = storage.getPlans()
  for (const time of planData.times) {
    const [h, m] = time.split(':')
    const timeMinutes = parseInt(h) * 60 + parseInt(m)
    const conflict = plans.find(p => {
      if (p.id === planData.id) return false
      if (p.slot !== planData.slot) return false
      if (p.deviceId !== planData.deviceId) return false
      return p.times.some(t => {
        const [ph, pm] = t.split(':')
        const pMinutes = parseInt(ph) * 60 + parseInt(pm)
        return Math.abs(timeMinutes - pMinutes) <= 30
      })
    })
    if (conflict) {
      throw new Error(`${conflict.medicineName}和${planData.medicineName}安排在同一药格（${conflict.times[0]}和${time}），可能造成混淆，请调整时间或药格`)
    }
  }
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isPlanActiveToday(plan, today) {
  return isPlanActiveOnDate(plan, today)
}

function isPlanActiveOnDate(plan, date) {
  if (!plan.repeatMode) return true
  const d = new Date(date)

  if (plan.repeatMode === 'daily') return true

  if (plan.repeatMode === 'weekly' && plan.weekDays) {
    const dayOfWeek = d.getDay() || 7
    return plan.weekDays.includes(dayOfWeek)
  }

  if (plan.repeatMode === 'interval' && plan.intervalDays) {
    if (!plan.startDate) return true
    const start = new Date(plan.startDate)
    const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000)
    return diffDays >= 0 && diffDays % plan.intervalDays === 0
  }

  if (plan.repeatMode === 'range' && plan.startDate && plan.endDate) {
    return date >= plan.startDate && date <= plan.endDate
  }

  return true
}

async function generateReport() {
  await delay()
  const records = storage.getRecords()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthRecords = records.filter(r => new Date(r.date) >= monthStart)

  const onTimeCount = monthRecords.filter(r => r.status === 'on_time' || r.status === 'early').length
  const delayedCount = monthRecords.filter(r => r.status === 'delayed').length
  const missedCount = monthRecords.filter(r => r.status === 'missed').length

  return { onTimeCount, delayedCount, missedCount }
}

module.exports = {
  bindDevice,
  getDeviceList,
  getDeviceDetail,
  updateDeviceSetting,
  unbindDevice,
  getTodayPlan,
  getPlansByDate,
  savePlan,
  updatePlanItem,
  deletePlanItem,
  getRecords,
  addMedicationRecord,
  getMessages,
  markMessageRead,
  markAllMessagesRead,
  deleteMessageItem,
  triggerSOS,
  simulateMedicationTaken,
  simulateMissedDose,
  getTemplates,
  saveTemplate,
  getComplianceStats,
  generateReport
}
