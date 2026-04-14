import {
  ADDON_SERVICE_KEYS,
  priceTable,
  vehicleSizeLabels,
  type AddonServiceKey,
  type ServiceKey,
  type VehicleSize,
} from "../data/siteContent"

const sizeIndex: Record<VehicleSize, number> = {
  small: 0,
  medium: 1,
  large: 2,
}

const MAIN_LINE_ORDER: ServiceKey[] = ["interior", "exterior", "wash_vacuum"]

function isMainKey(k: ServiceKey): boolean {
  return (
    k === "interior" ||
    k === "exterior" ||
    k === "wash_vacuum" ||
    k === "full_detail"
  )
}

function isAddonKey(k: ServiceKey): k is AddonServiceKey {
  return ADDON_SERVICE_KEYS.includes(k as AddonServiceKey)
}

export type PriceLine = {
  label: string
  amount: number
}

export type PriceBreakdown = {
  lines: PriceLine[]
  total: number | null
  note?: string
}

function lineForKey(key: ServiceKey, idx: number, sizeName: string): PriceLine | null {
  const row = priceTable.rows.find((r) => r.key === key)
  if (!row) return null
  return {
    label: `${row.name} (${sizeName})`,
    amount: row.values[idx],
  }
}

function buildOrderedLines(
  services: ServiceKey[],
  idx: number,
  sizeName: string,
): PriceLine[] {
  const lines: PriceLine[] = []
  for (const key of MAIN_LINE_ORDER) {
    if (services.includes(key)) {
      const line = lineForKey(key, idx, sizeName)
      if (line) lines.push(line)
    }
  }
  for (const key of ADDON_SERVICE_KEYS) {
    if (services.includes(key)) {
      const line = lineForKey(key, idx, sizeName)
      if (line) lines.push(line)
    }
  }
  return lines
}

/** Line-item estimate from selected services and vehicle size. */
export function getPriceBreakdown(
  services: ServiceKey[],
  vehicleSize: VehicleSize,
): PriceBreakdown {
  const idx = sizeIndex[vehicleSize]
  const sizeName = vehicleSizeLabels[vehicleSize]

  if (services.length === 0) {
    return {
      lines: [],
      total: null,
      note: "Select at least one main service to see pricing for your vehicle size.",
    }
  }

  const mains = services.filter(isMainKey)
  const addons = services.filter(isAddonKey)
  const hasFull = services.includes("full_detail")
  const hasWash = services.includes("wash_vacuum")
  const hasInt = services.includes("interior")
  const hasExt = services.includes("exterior")

  if (hasFull) {
    const invalidWithFull = services.some((s) => s !== "full_detail")
    if (invalidWithFull) {
      return {
        lines: [],
        total: null,
        note: "Full detailing is booked as a standalone service. Deselect add-ons and other packages, or remove full detailing.",
      }
    }
    return {
      lines: [],
      total: null,
      note: priceTable.fullDetailingNote,
    }
  }

  if (mains.length === 0 && addons.length > 0) {
    return {
      lines: [],
      total: null,
      note: "Add interior and/or exterior deals, wash & vacuum, or full detailing before choosing add-ons.",
    }
  }

  if (hasWash && (hasInt || hasExt)) {
    return {
      lines: [],
      total: null,
      note: "Wash & vacuum cannot be combined with interior or exterior deals in one booking.",
    }
  }

  const unknown = services.filter((s) => !isMainKey(s) && !isAddonKey(s))
  if (unknown.length > 0) {
    return { lines: [], total: null, note: "Invalid combination of services." }
  }

  if (hasWash) {
    const invalidMain = mains.some((m) => m !== "wash_vacuum")
    if (invalidMain) {
      return { lines: [], total: null, note: "Invalid combination of services." }
    }
    const lines = buildOrderedLines(services, idx, sizeName)
    const total = lines.reduce((sum, line) => sum + line.amount, 0)
    return { lines, total }
  }

  if (!hasInt && !hasExt) {
    return {
      lines: [],
      total: null,
      note: "Select interior and/or exterior deals, wash & vacuum, or full detailing.",
    }
  }

  const invalidMain = mains.some((m) => m !== "interior" && m !== "exterior")
  if (invalidMain) {
    return { lines: [], total: null, note: "Invalid combination of services." }
  }

  const lines = buildOrderedLines(services, idx, sizeName)
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  return { lines, total }
}

export function estimateBookingPrice(
  services: ServiceKey[],
  vehicleSize: VehicleSize,
): { total: number | null; note?: string } {
  const { total, note } = getPriceBreakdown(services, vehicleSize)
  return { total, note }
}

export type UnitPrices = {
  interior: number
  exterior: number
  washVacuum: number
} & Record<AddonServiceKey, number>

/** List prices for the booking UI (per selected vehicle size). */
export function getUnitPricesForVehicle(vehicleSize: VehicleSize): UnitPrices {
  const idx = sizeIndex[vehicleSize]
  const amount = (key: ServiceKey) => {
    const row = priceTable.rows.find((r) => r.key === key)
    if (!row) throw new Error(`Missing price row: ${key}`)
    return row.values[idx]
  }
  const addons = Object.fromEntries(
    ADDON_SERVICE_KEYS.map((k) => [k, amount(k)]),
  ) as Record<AddonServiceKey, number>
  return {
    interior: amount("interior"),
    exterior: amount("exterior"),
    washVacuum: amount("wash_vacuum"),
    ...addons,
  }
}

export function formatKyd(amount: number): string {
  return `$${amount.toFixed(2)} KYD`
}
