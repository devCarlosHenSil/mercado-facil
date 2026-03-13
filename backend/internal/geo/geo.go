package geo

import "math"

const earthRadiusKm = 6371.0

// Haversine calcula distância em km entre dois pontos geográficos
func Haversine(lat1, lng1, lat2, lng2 float64) float64 {
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}

func toRad(deg float64) float64 {
	return deg * math.Pi / 180
}

// BoundingBox calcula bounding box para otimizar queries geoespaciais
type BoundingBox struct {
	MinLat, MaxLat float64
	MinLng, MaxLng float64
}

func GetBoundingBox(lat, lng, radiusKm float64) BoundingBox {
	latDelta := radiusKm / earthRadiusKm * (180 / math.Pi)
	lngDelta := radiusKm / (earthRadiusKm * math.Cos(toRad(lat))) * (180 / math.Pi)

	return BoundingBox{
		MinLat: lat - latDelta,
		MaxLat: lat + latDelta,
		MinLng: lng - lngDelta,
		MaxLng: lng + lngDelta,
	}
}

// IsWithinRadius verifica se um ponto está dentro do raio
func IsWithinRadius(lat1, lng1, lat2, lng2, radiusKm float64) bool {
	return Haversine(lat1, lng1, lat2, lng2) <= radiusKm
}
