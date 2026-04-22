export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/products/index',
    'pages/products/detail/index',
    'pages/cart/index',
    'pages/orders/index',
    'pages/orders/detail/index',
    'pages/orders/address-select/index',
    'pages/user/index',
    'pages/user/addresses/index',
    'pages/user/addresses/edit/index',
    'pages/index/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '生鲜商城',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999',
    selectedColor: '#ffcc00',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/products/index',
        text: '分类'
      },
      {
        pagePath: 'pages/cart/index',
        text: '购物车'
      },
      {
        pagePath: 'pages/user/index',
        text: '我的'
      }
    ]
  }
})
