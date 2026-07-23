"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

export const DEFAULT_RADIUS_M = 10
export const MIN_RADIUS_M = 5
export const MAX_RADIUS_M = 500

/** GPS 도착 반경 설정 — null 이면 기본값(10m) 사용 */
export function RadiusControl({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const custom = value != null
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">GPS 도착 반경</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {custom ? "직접 설정" : `기본 ${DEFAULT_RADIUS_M}m`}
          </span>
          <Switch
            checked={custom}
            onCheckedChange={(on) => onChange(on ? 30 : null)}
          />
        </div>
      </div>
      {custom && (
        <div className="flex items-center gap-3">
          <Slider
            value={[value]}
            min={MIN_RADIUS_M}
            max={MAX_RADIUS_M}
            step={5}
            onValueChange={([v]) => onChange(v)}
            className="flex-1"
          />
          <span className="w-14 text-right text-sm font-medium tabular-nums">
            {value}m
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        참가자가 이 반경 안에 들어오면 도착으로 인정돼요.
      </p>
    </div>
  )
}
