<p align="center">
  <img src="images/tab-home-active.png" width="80" alt="银领时代 Logo" />
</p>

<h1 align="center">银领时代 · 孝心守护</h1>

<p align="center">
  <strong>基于微信小程序的智能药箱远程监护平台</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/微信小程序-7.0+-07C160?logo=wechat&logoColor=white" />
  <img src="https://img.shields.io/badge/蓝牙-BLE%204.0+-0082FC?logo=bluetooth&logoColor=white" />
  <img src="https://img.shields.io/badge/组件框架-glass--easel-7B68EE" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## 项目简介

「银领时代·孝心守护」是一款面向家庭健康管理的微信小程序，通过与智能药箱硬件设备的蓝牙连接，实现对家中老人服药的远程监护。子女可以通过小程序为父母设置用药计划、查看服药记录、接收漏服提醒和紧急求助通知，用科技守护家人的健康。

### 核心价值

| 场景 | 痛点 | 解决方案 |
|------|------|----------|
| 子女外出工作 | 无法确认父母是否按时服药 | 药箱自动记录服药状态，实时同步到小程序 |
| 老人记忆力减退 | 容易忘记或重复服药 | 智能药箱按时语音提醒，子女可远程设置计划 |
| 突发紧急情况 | 老人无法及时呼救 | 药箱一键 SOS，子女立即收到紧急通知 |
| 长期慢病管理 | 服药依从性难以追踪 | 日/周/月多维服药统计，依从率一目了然 |

---

## 功能概览

### 四大主模块

| 模块 | 功能说明 |
|------|----------|
| **首页** | 问候语、天气显示、今日服药进度环、用药提醒卡片、健康小贴士、SOS 紧急提醒 |
| **记录** | 日视图 / 周热力图 / 月日历三种视角查看服药历史，按时/延迟/漏服分类筛选 |
| **消息** | 全部消息 / 紧急通知分类，漏服提醒、电量预警、温度异常、SOS 求助等推送 |
| **我的** | 个人资料、设备管理、家人邀请、大字体切换、帮助反馈、健康咨询入口 |

### 设备绑定流程

```
扫码(QR/条形码/DataMatrix/PDF417)
  → 蓝牙初始化 (mode: central)
    → 扫描所有 BLE 外围设备
      → 用户选择目标设备
        → 建立 BLE 连接
          → MTU 协商
            → 动态发现 Service / Characteristic
              → 启用 Notify 通知
                → 完成绑定
```

### 辅助页面

| 页面 | 功能 |
|------|------|
| 设备详情 | 查看电量、温湿度、固件版本，调节音量/亮度/温湿度阈值，编辑 SOS 联系人 |
| 用药计划 | 创建/编辑/删除用药计划，支持多时段、多药品、重复模式（每日/每周/自定义） |
| 计划表单 | 药品名称、剂量单位、服药时间、药仓编号、重复周期 |
| SOS 详情 | 紧急求助的完整信息展示、一键拨号、标记处理 |
| 消息设置 | 通知开关、免打扰时段 |
| 健康报告 | 服药依从率统计、趋势图表 |
| 帮助中心 | 常见问题与使用指南 |
| 意见反馈 | 用户反馈提交 |
| 关于 | 版本信息、隐私政策 |

---

## 技术架构

```
SilverCollarTimes/
├── app.js                          # 应用入口，全局数据初始化
├── app.json                        # 页面路由、TabBar、权限配置
├── app.wxss                        # 全局样式与 CSS 变量
├── project.config.json             # 项目编译配置
├── utils/
│   ├── bluetooth.js                # BLE 蓝牙核心模块 (20+ API)
│   ├── mock-api.js                 # 模拟后端接口层 (延迟、数据校验)
│   ├── storage.js                  # 本地持久化存储层
│   └── util.js                     # 通用工具函数
├── pages/
│   ├── index/                      # 首页
│   ├── records/                    # 服药记录
│   ├── messages/                   # 消息中心
│   ├── profile/                    # 个人中心
│   ├── device-bind/                # 设备绑定 (扫码+蓝牙)
│   ├── device-detail/              # 设备详情设置
│   ├── plan/                       # 用药计划列表
│   ├── plan-form/                  # 用药计划表单
│   ├── sos-detail/                 # SOS 紧急详情
│   ├── message-settings/           # 消息通知设置
│   ├── report/                     # 健康报告
│   ├── help/                       # 帮助中心
│   ├── feedback/                   # 意见反馈
│   └── about/                      # 关于页面
└── images/                         # TabBar 图标资源
```

### 三层数据架构

```
┌─────────────────────────────────────┐
│          Page (视图层)               │
│  各页面 .wxml / .js / .wxss         │
└──────────────┬──────────────────────┘
               │ 调用
┌──────────────▼──────────────────────┐
│       mock-api.js (业务接口层)       │
│  绑定设备、用药计划、服药记录、消息   │
│  模拟网络延迟 300-500ms              │
└──────────────┬──────────────────────┘
               │ 调用
┌──────────────▼──────────────────────┐
│       storage.js (持久化存储层)      │
│  wx.getStorageSync / setStorageSync │
│  设备/计划/记录/消息/模板 结构化存储  │
└─────────────────────────────────────┘
```

> 接入真实后端时，仅需替换 `mock-api.js` 中的接口实现，页面层代码无需任何改动。

### 蓝牙模块设计 ([详细代码](utils/bluetooth.js))

基于微信官方 [蓝牙低功耗 BLE 开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/device/ble.html) 实现，遵循 GATT 规范，支持连接**所有种类**的 BLE 外围设备：

| API | 说明 |
|-----|------|
| `initBluetooth()` / `closeBluetooth()` | 蓝牙适配器生命周期管理 |
| `startScan(options)` / `stopScan()` | 设备扫描（支持 UUID/名称过滤、重复上报控制） |
| `connectDevice()` / `disconnectDevice()` | 连接/断开设备 |
| `getDeviceServices()` / `getCharacteristics()` | 动态服务与特征值发现 |
| `readCharacteristic()` / `writeCharacteristic()` / `writeHex()` | 数据读写（支持 String / ArrayBuffer / Hex） |
| `enableNotify()` / `disableNotify()` / `onDataReceived()` | 特征值通知订阅 |
| `setMTU()` | Android MTU 协商 |
| `getBLEDeviceRSSI()` / `getConnectedDevices()` | 信号强度读取、已连接设备查询 |
| `onBluetoothAdapterStateChange()` | 蓝牙开关状态监听 |
| `onBLEConnectionStateChange()` | 设备连接断开监听 |
| `uuid16To128()` / `uuid32To128()` / `normalizeUUID()` | UUID 自动补位（兼容 Android 8.0.9 以下） |

**跨平台兼容性保障：**

- **iOS**: `mode: 'central'` 主机模式初始化，`deviceId` 变化自动处理
- **Android 8.0.9+**: 原生支持 16/32/128 位 UUID
- **Android 8.0.9 以下**: 自动将 16/32 位 UUID 补位至 128 位
- **Android 6.0+**: 自动提示需要定位权限（蓝牙扫描依赖）

---

## 快速开始

### 环境要求

- 微信开发者工具（[下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）
- 微信小程序 AppID（在 [微信公众平台](https://mp.weixin.qq.com/) 注册获取）
- 基础库版本 ≥ 1.1.0（BLE 主机模式），推荐 ≥ 2.10.3

### 运行步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd SilverCollarTimes

# 2. 打开微信开发者工具
# 3. 导入项目，选择 SilverCollarTimes 目录
# 4. 填入你的 AppID（在 project.config.json 中修改 "appid" 字段）

# 5. 点击「编译」即可在模拟器中预览
```

### 真机蓝牙调试

由于模拟器不支持蓝牙功能，测试设备绑定流程时**必须使用真机预览**：

1. 在微信开发者工具中点击「预览」
2. 用手机微信扫描生成的二维码
3. 在真机上进入「设备绑定」页面测试扫码和蓝牙连接

---

## 数据模拟

项目内置完整的 Mock 数据层，无需后端即可运行全部功能：

| 数据类别 | 模拟内容 |
|----------|----------|
| 设备信息 | 电量 85%、温度 26°C、湿度 58%、14 个药仓 |
| 用药计划 | 根据添加的用药计划动态生成 |
| 服药记录 | 模拟准时/延迟/漏服三种状态及对应消息通知 |
| SOS 求助 | 模拟紧急求助消息，包含未处理标记 |

### 模拟服药记录

在「我的」页面连续点击版本号 5 次可开启调试面板，快速模拟服药/漏服等场景。

---

## 设计规范

### CSS 变量体系

```css
page {
  --primary: #4A90D9;        /* 主题蓝 */
  --primary-light: #7AB8F5;  /* 浅蓝 */
  --primary-dark: #2E6DB4;   /* 深蓝 */
  --success: #34C759;        /* 成功绿 */
  --warning: #FF9500;        /* 警告橙 */
  --danger: #FF3B30;         /* 危险红 */
  --bg: #F5F7FA;             /* 页面背景 */
  --bg-card: #FFFFFF;        /* 卡片背景 */
  --text-primary: #1A1A1A;   /* 主文字 */
  --text-secondary: #666666; /* 次文字 */
  --text-hint: #999999;      /* 提示文字 */
  --border: #E8ECF1;         /* 分割线 */
  --shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); /* 卡片阴影 */
}
```

### 无障碍适配

- 大字体模式：在「我的」页面可一键切换为大字体，适配老年用户的阅读习惯
- 全局 CSS 变量驱动，字体模式切换时即时生效

### 页面权限

```json
{
  "scope.userLocation": { "desc": "用于获取老人所在城市天气信息" },
  "scope.bluetooth": { "desc": "用于扫描并连接智能药箱蓝牙设备" }
}
```

---

## 接入真实后端

将 `utils/mock-api.js` 中的函数替换为真实 HTTP 请求即可：

```javascript
// 示例：将 Mock 实现替换为 wx.request
async function getDeviceList() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://your-api.com/devices',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + getToken() },
      success: (res) => resolve(res.data),
      fail: reject
    })
  })
}
```

`storage.js` 可作为本地缓存层配合使用，实现离线数据查询体验。

---

## 项目状态

项目处于开发阶段，当前版本包含了完整的 UI 界面、蓝牙模块、Mock 数据层。生产环境上线前需要：

- [ ] 替换 `mock-api.js` 为真实后端接口
- [ ] 填入正式 AppID
- [ ] 配置服务器域名白名单
- [ ] 真机完整测试蓝牙兼容性
- [ ] 发布审核

---

## 版权信息

MIT License © 银领时代
