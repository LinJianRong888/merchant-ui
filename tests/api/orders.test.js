import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import {
  createSaleOrder,
  createOrderPayment,
  getOrderDetail,
  listOrders,
  cancelOrder
} from '@/api/orders'

describe('orders API', () => {
  const mockAddress = {
    contact_name: '张三',
    contact_phone: '13800138000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    address_detail: '科技园'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSaleOrder', () => {
    it('单商品下单应发送正确的请求体', async () => {
      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 1, order_no: 'ORD001', status: 'pending' }
      })

      const result = await createSaleOrder({
        productId: 1,
        quantity: 2,
        address: mockAddress
      })

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/', {
        order_type: 'sale',
        product_id: 1,
        quantity: 2,
        address: mockAddress
      })
      expect(result).toEqual({ id: 1, order_no: 'ORD001', status: 'pending' })
    })

    it('多商品下单应发送 products 数组', async () => {
      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 2, order_no: 'ORD002' }
      })

      const result = await createSaleOrder({
        products: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }],
        address: mockAddress
      })

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/', {
        order_type: 'sale',
        products: [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }],
        address: mockAddress
      })
      expect(result.id).toBe(2)
    })

    it('缺少地址参数应抛出错误', async () => {
      await expect(createSaleOrder({
        productId: 1,
        quantity: 1
      })).rejects.toThrow('地址参数必填')
    })

    it('缺少商品参数应抛出错误', async () => {
      await expect(createSaleOrder({
        address: mockAddress
      })).rejects.toThrow('商品参数必填')
    })

    it('后端返回错误时应提取错误信息', async () => {
      request.post.mockResolvedValue({
        statusCode: 400,
        data: { detail: '库存不足' }
      })

      await expect(createSaleOrder({
        productId: 1,
        quantity: 999,
        address: mockAddress
      })).rejects.toThrow('库存不足')
    })

    it('后端返回 500 时应使用默认错误信息', async () => {
      request.post.mockResolvedValue({
        statusCode: 500,
        data: {}
      })

      await expect(createSaleOrder({
        productId: 1,
        quantity: 1,
        address: mockAddress
      })).rejects.toThrow('创建订单失败')
    })
  })

  describe('createOrderPayment', () => {
    it('应请求支付参数并返回', async () => {
      const mockPaymentResponse = {
        request_payment: {
          timeStamp: '1234567890',
          nonceStr: 'test-nonce',
          package: 'prepay_id=wx123456',
          signType: 'MD5',
          paySign: 'test-signature'
        }
      }

      request.post.mockResolvedValue({
        statusCode: 200,
        data: mockPaymentResponse
      })

      const result = await createOrderPayment(1)

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/1/pay/')
      expect(result).toEqual(mockPaymentResponse)
    })
  })

  describe('getOrderDetail', () => {
    it('应请求指定订单详情', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { id: 1, order_no: 'ORD001', status: 'paid' }
      })

      const result = await getOrderDetail(1)

      expect(request.get).toHaveBeenCalledWith('/api/v1/orders/1/')
      expect(result.status).toBe('paid')
    })
  })

  describe('listOrders', () => {
    it('应请求订单列表', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: [
          { id: 1, order_no: 'ORD001', status: 'pending' },
          { id: 2, order_no: 'ORD002', status: 'paid' }
        ]
      })

      const result = await listOrders()

      expect(request.get).toHaveBeenCalledWith('/api/v1/orders/')
      expect(result).toHaveLength(2)
    })
  })

  describe('cancelOrder', () => {
    it('应请求取消订单', async () => {
      request.post.mockResolvedValue({
        statusCode: 200,
        data: { success: true }
      })

      await cancelOrder(1)

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/1/cancel/')
    })
  })
})
