import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';

interface PriorityStatisticsProps {
  onClose: () => void;
}

const PriorityStatistics = function PriorityStatistics({ onClose }: PriorityStatisticsProps) {
  return (
    <Panel
      position="center"
      width="800px"
      marginHorizontal={20}
      marginVertical={32}
    >
      <Title onClose={onClose}>
        우선순위 통계
      </Title>

      <Spacer height={16} />

      {/* 통계 내용 추가 예정 */}
      <div className="text-white">
        통계 내용이 여기에 표시됩니다.
      </div>
    </Panel>
  );
};

export default PriorityStatistics;
