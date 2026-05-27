Page({
  data: {
    faqs: [
      { q: '如何绑定智能药箱？', a: '打开药箱底部，扫描二维码即可完成绑定。绑定后可在"设备管理"中查看设备状态。', open: false },
      { q: '如何设置用药计划？', a: '进入"计划"页面，点击"添加计划"，填写药品名称、剂量、时间和药格即可。', open: false },
      { q: 'SOS紧急求助如何触发？', a: '老人长按药箱上的SOS按钮3秒即可触发紧急求助，系统会立即通知所有亲情号成员。', open: false },
      { q: '如何邀请家人共同管理？', a: '进入"我的"页面，点击"邀请亲情号"，生成邀请卡片分享给微信好友即可。', open: false },
      { q: '药箱离线了怎么办？', a: '请检查药箱是否通电、WiFi是否正常。如持续离线，请联系客服。', open: false }
    ],
    guides: [
      { title: '首次使用', desc: '绑定药箱 → 设置用药计划 → 放入药品 → 开始守护' },
      { title: '日常查看', desc: '首页查看服药状态 → 记录页查看历史 → 消息页查看通知' },
      { title: '紧急处理', desc: '收到SOS通知 → 立即联系老人 → 标记已处理' }
    ]
  },

  toggleFaq(e) {
    const index = e.currentTarget.dataset.index
    const faqs = this.data.faqs.map((item, i) => {
      if (i === index) item.open = !item.open
      return item
    })
    this.setData({ faqs })
  }
})
