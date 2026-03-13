import { useEffect } from 'react'
import { useStore } from '../store/useStore'

// SET TRUE para usar localizacao fixa (quando geo estiver bloqueada pelo sistema)
// SET FALSE quando quiser usar GPS/localizacao real do browser
const USE_FIXED_LOCATION = true
const FIXED_LOCATION = { lat: -23.2644, lng: -47.2994, city: 'Itu', state: 'SP' }

export function useGeolocation() {
  const { setLocation, setLocationLoading } = useStore()

  useEffect(() => {
    if (USE_FIXED_LOCATION) {
      setLocation(FIXED_LOCATION)
      return
    }

    if (!navigator.geolocation) {
      setLocation(FIXED_LOCATION)
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let city = 'Itu', state = 'SP'
        try {
          const r = await fetch(
            'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=pt-BR',
            { headers: { 'User-Agent': 'MercadoFacil/1.0' } }
          )
          const d = await r.json()
          city = d.address?.city || d.address?.town || d.address?.village || city
          state = d.address?.state_code || state
        } catch (_) {}
        setLocation({ lat, lng, city, state })
        setLocationLoading(false)
      },
      () => {
        setLocation(FIXED_LOCATION)
        setLocationLoading(false)
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])
}
