import { pcaa } from '@/data/pcaa'

const ROOT_CODE = '86'

function normalizeName(name) {
  return typeof name === 'string' ? name.trim() : ''
}

/**
 * Find province code by name
 */
export function findProvinceCode(name) {
  const targetName = normalizeName(name)
  if (!targetName) return ''

  for (const [code, provinceName] of Object.entries(pcaa[ROOT_CODE] || {})) {
    if (provinceName === targetName) {
      return code
    }
  }

  return ''
}

/**
 * Find city code by name within a province
 */
export function findCityCode(provinceCode, cityName) {
  const targetName = normalizeName(cityName)
  if (!provinceCode || !targetName || !pcaa[provinceCode]) return ''

  for (const [code, name] of Object.entries(pcaa[provinceCode])) {
    if (name === targetName) {
      return code
    }
  }
  return ''
}

/**
 * Find district code by name within a city
 */
export function findDistrictCode(cityCode, districtName) {
  const targetName = normalizeName(districtName)
  if (!cityCode || !targetName || !pcaa[cityCode]) return ''

  for (const [code, name] of Object.entries(pcaa[cityCode])) {
    if (name === targetName) {
      return code
    }
  }
  return ''
}

/**
 * Convert address names to codes for form
 */
export function addressNamesToCodes(address) {
  const provinceCode = findProvinceCode(address.province)
  const cityCode = findCityCode(provinceCode, address.city)
  const districtCode = findDistrictCode(cityCode, address.district)

  return {
    ...address,
    province: provinceCode,
    city: cityCode,
    district: districtCode
  }
}

/**
 * Convert address codes to names for display
 */
export function addressCodesToNames(address) {
  const provinceName = address.province && pcaa[ROOT_CODE]?.[address.province] ? pcaa[ROOT_CODE][address.province] : address.province
  const cityName = address.city && pcaa[address.province]?.[address.city] ? pcaa[address.province][address.city] : address.city
  const districtName = address.district && pcaa[address.city]?.[address.district] ? pcaa[address.city][address.district] : address.district

  return {
    ...address,
    province: provinceName,
    city: cityName,
    district: districtName
  }
}