import { useState } from 'react';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import TabNavigation from '@/components/basic/TabNavigation';
import {
  RealtimeContent,
  TodayContent,
  WeekContent,
  MonthContent
} from './PriorityStatisticsContent';

interface PriorityStatisticsProps {
  onClose: () => void;
}

const PriorityStatistics = function PriorityStatistics({ onClose }: PriorityStatisticsProps) {
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

  return (
    <Panel
      className="flex flex-col items-center gap-4"
      position="center"
      marginHorizontal={20}
      marginVertical={32}
    >
      <Title onClose={onClose}>
        통계
      </Title>


      <TabNavigation
        tabs={['실시간', '오늘', '최근 7일', '최근 1개월']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 탭 콘텐츠 영역 */}
      <div className="flex flex-1 w-full" style={{ minHeight: '500px' }}>
        {renderTabContent()}
      </div>
    </Panel>
  );
};

export default PriorityStatistics;
