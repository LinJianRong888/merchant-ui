import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import {
  listUserAddresses,
  getUserAddress,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress
} from '@/api/user-addresses'

describe('user-addresses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listUserAddresses', () => {
    it('应请求地址列表', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: [
          { id: 1, contact_name: '张三', is_default: true },
          { id: 2, contact_name: '李四', is_default: false }
        ]
      })

      const result = await listUserAddresses()

      expect(request.get).toHaveBeenCalledWith('/api/v1/user-addresses/')
      expect(result).toHaveLength(2)
      expect(result[0].is_default).toBe(true)
    })
  })

  describe('getUserAddress', () => {
    it('应请求指定地址详情', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { id: 1, contact_name: '张三', contact_phone: '13800138000' }
      })

      const result = await getUserAddress(1)

      expect(request.get).toHaveBeenCalledWith('/api/v1/user-addresses/1/')
      expect(result.contact_name).toBe('张三')
    })
  })

  describe('createUserAddress', () => {
    it('应发送正确的地址数据', async () => {
      const addressData = {
        contact_name: '王五',
        contact_phone: '13900139000',
        province: '广东省',
        city: '广州市',
        district: '天河区',
        address_detail: '珠江新城',
        is_default: true
      }

      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 3, ...addressData }
      })

      const result = await createUserAddress(addressData)

      expect(request.post).toHaveBeenCalledWith('/api/v1/user-addresses/', addressData)
      expect(result.id).toBe(3)
      expect(result.contact_name).toBe('王五')
    })
  })

  describe('updateUserAddress', () => {
    it('应使用 PATCH 方法更新地址', async () => {
      const updateData = { contact_name: '王五改' }

      request.patch.mockResolvedValue({
        statusCode: 200,
        data: { id: 3, ...updateData }
      })

      const result = await updateUserAddress(3, updateData)

      expect(request.patch).toHaveBeenCalledWith('/api/v1/user-addresses/3/', updateData)
      expect(result.contact_name).toBe('王五改')
    })
  })

  describe('deleteUserAddress', () => {
    it('应请求删除地址', async () => {
      request.delete.mockResolvedValue({
        statusCode: 204,
        data: null
      })

      await deleteUserAddress(1)

      expect(request.delete).toHaveBeenCalledWith('/api/v1/user-addresses/1/')
    })

    it('删除失败时应抛出错误', async () => {
      request.delete.mockResolvedValue({
        statusCode: 404,
        data: { detail: '地址不存在' }
      })

      await expect(deleteUserAddress(999)).rejects.toThrow('地址不存在')
    })
  })
})
