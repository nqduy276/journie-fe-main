import haGiangImage from '../assets/images/ha-giang.jpg'
import haLongImage from '../assets/images/ha-long.jpg'
import hoiAnImage from '../assets/images/hoi-an.jpg'
import ninhBinhImage from '../assets/images/ninh-binh.jpg'
import phuQuocImage from '../assets/images/phu-quoc.jpg'
import saiGonImage from '../assets/images/ho-chi-minh-city.jpg'
import type { CityId } from './types'

/** Photos exist for six destinations; Hà Nội and Đà Lạt fall back to a tinted girih cover. */
export const cityImage: Partial<Record<CityId, string>> = {
  'ha-giang': haGiangImage,
  'ha-long': haLongImage,
  'hoi-an': hoiAnImage,
  'ninh-binh': ninhBinhImage,
  'phu-quoc': phuQuocImage,
  'sai-gon': saiGonImage,
}
