Page({
  data: {
    features: [
      { icon: '📊', name: '服药看板', desc: '实时查看父母服药进度，一目了然' },
      { icon: '📅', name: '用药计划', desc: '灵活设置用药时间、剂量和药格' },
      { icon: '📝', name: '服药记录', desc: '日/周/月多维度查看服药历史' },
      { icon: '🔔', name: '智能提醒', desc: '漏服提醒、SOS紧急通知实时推送' },
      { icon: '👨‍👩‍👧', name: '亲情号', desc: '邀请家人共同守护父母健康' }
    ]
  },

  openPrivacy() {
    wx.showToast({ title: '隐私政策页面开发中', icon: 'none' })
  },

  openTerms() {
    wx.showToast({ title: '用户协议页面开发中', icon: 'none' })
  }
})
