/** 토스페이먼츠 표준 결제 SDK(v2) 로더 — 결제 직전에만 스크립트를 붙여요. */

const SDK_URL = "https://js.tosspayments.com/v2/standard"

type PaymentRequest = {
  method: string
  amount: { currency: string; value: number }
  orderId: string
  orderName: string
  successUrl: string
  failUrl: string
  customerEmail?: string
  customerName?: string
  customerMobilePhone?: string
  card?: {
    useEscrow?: boolean
    flowMode?: string
    useCardPoint?: boolean
    useAppCardOnly?: boolean
  }
}

export type TossPaymentsFn = (clientKey: string) => {
  payment: (opts: { customerKey: string }) => {
    requestPayment: (req: PaymentRequest) => Promise<void>
  }
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsFn
  }
}

let loading: Promise<TossPaymentsFn> | null = null

export function loadTossPayments(): Promise<TossPaymentsFn> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("브라우저에서만 결제를 열 수 있어요."))
  if (window.TossPayments) return Promise.resolve(window.TossPayments)
  if (loading) return loading

  loading = new Promise<TossPaymentsFn>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`
    )
    const script = existing ?? document.createElement("script")

    script.addEventListener(
      "load",
      () => {
        if (window.TossPayments) resolve(window.TossPayments)
        else reject(new Error("결제 모듈을 불러오지 못했어요."))
      },
      { once: true }
    )
    script.addEventListener(
      "error",
      () => {
        loading = null
        reject(new Error("결제 모듈을 불러오지 못했어요. 잠시 후 다시 시도해주세요."))
      },
      { once: true }
    )

    if (!existing) {
      script.src = SDK_URL
      script.async = true
      document.head.appendChild(script)
    }
  })

  return loading
}
