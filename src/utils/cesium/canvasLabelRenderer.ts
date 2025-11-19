/**
 * Canvas Label Renderer
 * HTML 스타일의 라벨을 Canvas로 렌더링하여 Cesium Billboard로 사용
 * - Cesium의 depth buffer를 따르므로 3D 객체 뒤에서 올바르게 가려짐
 */

interface LabelStyle {
  text: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
}

interface FacilityLabelData {
  rank: number;
  name: string;
  levelStyle: LabelStyle;
}

/**
 * 취약시설 라벨을 Canvas에 그려서 data URL 반환
 * @param data - 시설 정보
 * @returns Canvas data URL
 */
export function createFacilityLabelCanvas(data: FacilityLabelData): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Canvas 크기 설정 (고해상도를 위해 2배)
  const scale = 2;
  const width = 180;
  const height = 200;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // 폰트 설정
  ctx.font = 'bold 14px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 배경 박스 그리기
  const boxX = 20;
  const boxY = 10;
  const boxWidth = 140;
  const boxHeight = 140;
  const boxRadius = 12;

  // 둥근 사각형 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.strokeStyle = '#C4C6C6';
  ctx.lineWidth = 1;
  drawRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, boxRadius);
  ctx.fill();
  ctx.stroke();

  // 순위 배지 (왼쪽 상단)
  const badgeX = boxX;
  const badgeY = boxY;
  const badgeRadius = 11;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = '#C4C6C6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 순위 텍스트
  ctx.fillStyle = 'black';
  ctx.font = 'bold 12px Pretendard, sans-serif';
  ctx.fillText(data.rank.toString(), badgeX, badgeY);

  // 시설명
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Pretendard, sans-serif';
  const nameY = boxY + 30;

  // 긴 이름은 줄바꿈 처리
  const maxWidth = boxWidth - 20;
  const words = data.name.split('');
  let line = '';
  let lineY = nameY;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, boxX + boxWidth / 2, lineY);
      line = words[i];
      lineY += 20;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, boxX + boxWidth / 2, lineY);

  // "미세먼지" 텍스트
  ctx.fillStyle = '#ccc';
  ctx.font = '12px Pretendard, sans-serif';
  ctx.fillText('미세먼지', boxX + boxWidth / 2, lineY + 28);

  // 등급 원형 배지
  const circleX = boxX + boxWidth / 2;
  const circleY = lineY + 58;
  const circleRadius = 25;

  ctx.fillStyle = data.levelStyle.backgroundColor;
  ctx.strokeStyle = data.levelStyle.borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 등급 텍스트
  ctx.fillStyle = data.levelStyle.color;
  ctx.font = 'bold 12px Pretendard, sans-serif';
  ctx.fillText(data.levelStyle.text, circleX, circleY);

  // 화살표 (삼각형)
  const arrowY = boxY + boxHeight;
  const arrowCenterX = boxX + boxWidth / 2;

  ctx.fillStyle = '#C4C6C6';
  ctx.beginPath();
  ctx.moveTo(arrowCenterX, arrowY + 10);
  ctx.lineTo(arrowCenterX - 8, arrowY);
  ctx.lineTo(arrowCenterX + 8, arrowY);
  ctx.closePath();
  ctx.fill();

  // 위치 마커 (작은 사각형)
  const markerX = boxX + boxWidth / 2;
  const markerY = arrowY + 15;
  const markerSize = 3;

  ctx.strokeStyle = data.levelStyle.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(markerX - markerSize, markerY - markerSize, markerSize * 2, markerSize * 2);

  return canvas.toDataURL('image/png');
}

/**
 * 둥근 사각형 그리기 헬퍼 함수
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
