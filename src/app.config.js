export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/products/index',
    'pages/products/detail/index',
    'pages/orders/index',
    'pages/orders/detail/index',
    'pages/orders/address-select/index',
    'pages/user/index',
    'pages/user/addresses/index',
    'pages/user/addresses/edit/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'merchant-ui',
    navigationBarTextStyle: 'black'
  }
})
