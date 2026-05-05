import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import { listSaleProducts, getSaleProductDetail } from '@/api/products'

describe('products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSaleProducts', () => {
    it('应以 sale mode 请求商品列表', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: [
          { id: 1, name: '商品A', price: '100.00', is_available: true },
          { id: 2, name: '商品B', price: '200.00', is_available: false }
        ]
      })

      const result = await listSaleProducts()

      expect(request.get).toHaveBeenCalledWith('/api/v1/products/', {
        data: { mode: 'sale' }
      })
      expect(result).toHaveLength(2)
    })

    it('返回非数组时应返回空数组', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { results: [] }
      })

      const result = await listSaleProducts()
      expect(result).toEqual([])
    })

    it('请求失败时应抛出错误', async () => {
      request.get.mockResolvedValue({
        statusCode: 500,
        data: { detail: '服务器错误' }
      })

      await expect(listSaleProducts()).rejects.toThrow('获取商品列表失败')
    })
  })

  describe('getSaleProductDetail', () => {
    it('应请求指定商品的详情', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { id: 1, name: '商品A', price: '100.00', stock: 50 }
      })

      const result = await getSaleProductDetail(1)

      expect(request.get).toHaveBeenCalledWith('/api/v1/products/1/', {
        data: { mode: 'sale' }
      })
      expect(result.name).toBe('商品A')
      expect(result.stock).toBe(50)
    })

    it('请求失败时应抛出错误', async () => {
      request.get.mockResolvedValue({
        statusCode: 404,
        data: { detail: '商品不存在' }
      })

      // products.js 的 ensureSuccessResponse 使用固定 fallback 信息
      await expect(getSaleProductDetail(999)).rejects.toThrow('获取商品详情失败')
    })
  })
})
