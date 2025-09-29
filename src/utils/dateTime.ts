/**
 * 날짜 및 시간대 처리 유틸리티
 * UTC ↔ Korea Seoul 시간대 변환 및 포맷팅
 */

/**
 * UTC 시간 문자열을 Korea Seoul 시간으로 변환하여 한국어 포맷으로 반환
 * Intl.DateTimeFormat을 사용한 정확한 시간대 변환
 * @param utcDateString - UTC 시간 문자열 (ISO 8601 형식)
 * @returns 한국어 시간 문자열 (예: "오후 3시 24분")
 */
export function formatUTCToKoreaTime(utcDateString: string): string {
  const utcDate = new Date(utcDateString)

  console.log('[dateTime] UTC 입력 데이터:', {
    input: utcDateString,
    parsedUTC: utcDate.toISOString(),
    utcHours: utcDate.getUTCHours()
  })

  // Intl.DateTimeFormat을 사용한 정확한 Korea Seoul 시간 변환
  const koreaFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const formattedTime = koreaFormatter.format(utcDate)

  console.log('[dateTime] Korea Seoul 변환 결과:', {
    originalUTC: `${utcDate.getUTCHours()}:${utcDate.getUTCMinutes().toString().padStart(2, '0')}`,
    koreaFormatted: formattedTime
  })

  return formattedTime
}

/**
 * 현재 Korea Seoul 시간을 한국어 형식으로 반환
 * @returns 한국어 시간 문자열 (예: "오후 3시 24분")
 */
export function getCurrentKoreaTime(): string {
  const now = new Date()

  // Intl.DateTimeFormat을 사용한 정확한 Korea Seoul 시간 변환
  const koreaFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return koreaFormatter.format(now)
}

// 레거시 함수들 - 호환성을 위해 유지 (사용하지 않음)
export function convertUTCToKoreaSeoul(utcDateString: string): Date {
  return new Date(utcDateString)
}

export function formatKoreaTime(date: Date): string {
  const koreaFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return koreaFormatter.format(date)
}

/**
 * 두 시간의 차이를 계산 (시간 단위)
 * @param laterTime - 나중 시간
 * @param earlierTime - 이전 시간
 * @returns 시간 차이 (시간 단위)
 */
export function getHoursDifference(laterTime: Date, earlierTime: Date): number {
  const diffMs = laterTime.getTime() - earlierTime.getTime()
  return Math.round(diffMs / (1000 * 60 * 60))
}