interface TabProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabProps) {
  return (
    <div 
      className="flex flex-col items-center w-full"
    >
      <div 
        className="flex items-start self-stretch w-full"
        style={{ 
          backgroundColor: 'transparent',
          height: '54px'
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={index}
            className="relative flex items-center justify-center flex-1 h-full cursor-pointer"
            onClick={() => onTabChange(index)}
            style={{
              color: activeTab === index ? '#FFD040' : '#696A6A',
              textAlign: 'center',
              fontVariantNumeric: 'lining-nums tabular-nums',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 700,
              lineHeight: 'normal',
              transition: 'color 0.1s ease'
            }}
          >
            {tab}
            {activeTab === index && (
              <div
                className="absolute bottom-0 left-0 right-0 transition-all"
                style={{
                  height: '3px',
                  backgroundColor: '#FFD040',
                  transition: 'all 0.1s ease'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}