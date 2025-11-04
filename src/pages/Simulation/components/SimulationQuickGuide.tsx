import Icon from '@/components/basic/Icon';

export default function SimulationQuickGuide() {
  return (
    <div
      className="absolute flex items-center gap-2 px-4 py-2"
      style={{
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#FFD040',
        borderRadius: '8px',
        zIndex: 1000
      }}
    >
      {/* 십자선 아이콘 */}
      <Icon name="info_black" className="text-black" />

      {/* 텍스트 */}
      <div
        style={{
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontWeight: '600',
          lineHeight: 'normal',
          color: '#000'
        }}
      >
        정류장 지점을 선택하면 해당 정류장의 오염물질 상세 시뮬레이션을 확인 할 수 있습니다.
      </div>
    </div>
  );
}
