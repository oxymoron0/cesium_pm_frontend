import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import TabNavigation from '@/components/basic/TabNavigation';
import {
  RealtimeContent,
  TodayContent,
  WeekContent,
  MonthContent
} from './PriorityStatisticsContent';
import { priorityStatisticsStore } from '@/stores/PriorityStatisticsStore';

interface PriorityStatisticsProps {
  onClose: () => void;
}

const PriorityStatistics = observer(function PriorityStatistics({ onClose }: PriorityStatisticsProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  // 활성 탭에 따른 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <RealtimeContent />;
      case 1:
        return <TodayContent />;
      case 2:
        return <WeekContent />;
      case 3:
        return <MonthContent />;
      default:
        return <RealtimeContent />;
    }
  };

  const { isStatisticsPopupMinimized } = priorityStatisticsStore;

  return (
    <div
      className="fixed z-[1002] flex flex-col items-center overflow-hidden rounded-[10px] border-t-[1.25px] border-t-yellow-400 pb-8 px-5 pt-8 text-white text-sm"
      style={{
        width: 'calc(100vw - 40px)',
        height: isStatisticsPopupMinimized ? 'auto' : 'calc(100vh - 64px)',
        top: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        gap: isStatisticsPopupMinimized ? '0' : '1rem'
      }}
    >
      <Title
        onClose={onClose}
        onMinimize={() => priorityStatisticsStore.toggleStatisticsPopupMinimize()}
      >
        통계
      </Title>

      <div style={{ display: isStatisticsPopupMinimized ? 'none' : 'contents' }}>
        <TabNavigation
          tabs={['실시간', '오늘', '최근 7일', '최근 1개월']}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* 탭 콘텐츠 영역 */}
        <div className="flex flex-1 w-full" style={{ minHeight: '500px' }}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
});

export default PriorityStatistics;
