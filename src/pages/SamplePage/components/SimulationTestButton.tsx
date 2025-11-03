import { observer } from 'mobx-react-lite';
import { simulationStore } from '@/stores/SimulationStore';
import { userStore } from '@/stores/UserStore';
import type { SimulationRequest } from '../../../types/simulation_request_types';

/**
 * 시뮬레이션 테스트용 제출 버튼
 * 하드코딩된 테스트 데이터를 사용하여 시뮬레이션 API를 테스트합니다.
 */
const SimulationTestButton = observer(function SimulationTestButton() {
  const handleTestSubmit = async () => {
    const testData: SimulationRequest = {
      simulation_name: 'test',
      user: userStore.currentUser,
      is_private: true,
      timestamp: '2025-10-15T09:00:00Z',
      lot: '부산광역시 부산진구 부전동 573-1',
      road_name: '부산광역시 부산진구 중앙대로 지하730',
      location: 'Busan',
      weather: {
        wind_direction_1m: 265,
        wind_speed_1m: 2.1,
        wind_direction_10m: 270,
        wind_speed_10m: 3.5,
        humidity: 70.5,
        sea_level_pressure: 1013.2,
        temperature: 23.2,
      },
      air_quality: {
        pm_type: 'pm10',
        points: [
          {
            name: '연제공용버스차고지',
            location: {
              longitude: 129.0531938,
              latitude: 35.1852289,
            },
            concentration: 45.2,
          },
          {
            name: '초읍고개',
            location: {
              longitude: 129.054089,
              latitude: 35.18547513,
            },
            concentration: 42.8,
          },
          {
            name: '개인택시조합',
            location: {
              longitude: 129.0557105,
              latitude: 35.18678579,
            },
            concentration: 38.5,
          },
          {
            name: '부산의료원 정문',
            location: {
              longitude: 129.0589711,
              latitude: 35.18795629,
            },
            concentration: 41.3,
          },
          {
            name: '부산의료원',
            location: {
              longitude: 129.0605792,
              latitude: 35.18825674,
            },
            concentration: 39.7,
          },
        ],
      },
    };

    console.log('[SimulationTestButton] Submitting test data:', testData);
    const response = await simulationStore.submitSimulationRequest(testData);

    if (response) {
      console.log('[SimulationTestButton] Submission successful:', response);
    } else {
      console.error('[SimulationTestButton] Submission failed');
    }
  };

  return (
    <div className="p-3 space-y-3 rounded-lg bg-gray-900/50">
      <div className="pb-2 text-sm font-semibold border-b text-yellow-400 border-yellow-400/20">
        시뮬레이션 API 테스트
      </div>

      <button
        onClick={handleTestSubmit}
        disabled={simulationStore.isSubmitting}
        className={`
          w-full px-4 py-2 rounded transition-colors
          ${
            simulationStore.isSubmitting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        {simulationStore.isSubmitting ? '제출 중...' : '테스트 데이터 제출'}
      </button>

      {simulationStore.submitError && (
        <div className="p-2 text-sm rounded bg-red-900/30 text-red-300">
          오류: {simulationStore.submitError}
        </div>
      )}
    </div>
  );
});

export default SimulationTestButton;
