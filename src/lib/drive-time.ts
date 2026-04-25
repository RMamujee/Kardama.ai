export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function estimateDriveMinutes(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const km = haversineKm(fromLat, fromLng, toLat, toLng)
  const avgSpeedKmh = 30 // LA traffic avg
  return Math.round((km / avgSpeedKmh) * 60 + 5) // +5 min parking/setup
}
