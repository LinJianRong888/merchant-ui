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
    navigationBarTitleText: '',
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
        text: '首页',
        iconPath: 'assets/home.png',
        selectedIconPath: 'assets/home-active.png'
      },
      {
        pagePath: 'pages/products/index',
        text: '商品',
        iconPath: 'assets/products.png',
        selectedIconPath: 'assets/products-active.png'
      },
      {
        pagePath: 'pages/cart/index',
        text: '购物车',
        iconPath: 'assets/cart.png',
        selectedIconPath: 'assets/购物车发光.png'
      },
      {
        pagePath: 'pages/user/index',
        text: '我的',
        iconPath: 'assets/user.png',
        selectedIconPath: 'assets/user-active.png'
      }
    ]
  }
})
