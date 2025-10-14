import Icon from '@/components/basic/Icon';

export default function DirectLocationGuide() {
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
      <Icon name="saas" className="w-5 h-5" />

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
        위치 지정하기
      </div>
    </div>
  );
}
