import Icon from '@/components/basic/Icon';

export default function PriorityLocationGuide() {
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
      <Icon name="location" className="w-4 h-4" />

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
        우선순위 조회 동 선택
      </div>
    </div>
  );
}
