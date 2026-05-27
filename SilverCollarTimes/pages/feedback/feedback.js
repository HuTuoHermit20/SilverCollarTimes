Page({
  data: {
    types: ['功能建议', 'Bug反馈', '使用问题', '其他'],
    typeIndex: 0,
    content: '',
    contact: ''
  },

  onTypeChange(e) {
    this.setData({ typeIndex: parseInt(e.detail.value) })
  },

  onContentChange(e) {
    this.setData({ content: e.detail.value })
  },

  onContactChange(e) {
    this.setData({ contact: e.detail.value })
  },

  submitFeedback() {
    if (this.data.content.length < 10) {
      wx.showToast({ title: '请至少输入10个字', icon: 'error' })
      return
    }
    wx.showToast({ title: '感谢您的反馈！', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1000)
  }
})
