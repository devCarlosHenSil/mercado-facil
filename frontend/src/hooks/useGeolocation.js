import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

export function useGeolocation() {
  const { setLocation, setLocationError, setLocationLoading } = useStore()

  useEffect(() => {
    try {
      const cached = localStorage.getItem('mf_location')
      if (cached) {
        const { loc, ts } = JSON.parse(cached)
        if (Date.now() - ts < 30 * 60 * 1000) {
          setLocation(loc)
          return
        }
      }
    } catch (_) {}

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada.')
      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let city = 'sua cidade', state = ''
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`,
            { headers: { 'User-Agent': 'MercadoFacil/1.0' } }
          )
          const data = await r.json()
          city  = data.address?.city || data.address?.town || data.address?.village || city
          state = data.address?.state_code || ''
        } catch (_) {}

        const loc = { lat, lng, city, state }
        setLocation(loc)
        setLocationLoading(false)
        try { localStorage.setItem('mf_location', JSON.stringify({ loc, ts: Date.now() })) } catch (_) {}
        toast.success(`��� ${city}${state ? ', ' + state : ''}`, {
          style: { background: '#1a1a23', color: '#f0f0f8', border: '1px solid rgba(255,255,255,0.1)' }
        })
      },
      (err) => {
        setLocationLoading(false)
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Permissão de localização negada.'
          : 'Não foi possível obter sua localização.'
        setLocationError(msg)
        toast.error(msg, { style: { background: '#1a1a23', color: '#f0f0f8' } })
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }, [])
}
