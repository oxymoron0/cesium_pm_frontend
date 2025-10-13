import { makeAutoObservable } from 'mobx';
import type { AddressSearchResult, SimulationConfig } from '../pages/Simulation/types';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_ADDRESS_RESULTS: AddressSearchResult[] = [
  // 전포동 지역
  {
    id: 'addr_1',
    roadAddress: '부산광역시 부산진구 중앙대로 749가길 7',
    jibunAddress: '부산광역시 부산진구 전포동 579-1',
    detailAddress: '예덕빌딩',
    geometry: {
      type: 'Point',
      coordinates: [129.0634, 35.1598]
    }
  },
  {
    id: 'addr_2',
    jibunAddress: '부산광역시 부산진구 전포동 579-3',
    geometry: {
      type: 'Point',
      coordinates: [129.0635, 35.1599]
    }
  },
  {
    id: 'addr_3',
    roadAddress: '부산광역시 부산진구 중앙대로 749가길 9',
    jibunAddress: '부산광역시 부산진구 전포동 580-5',
    geometry: {
      type: 'Point',
      coordinates: [129.0636, 35.1600]
    }
  },
  {
    id: 'addr_4',
    roadAddress: '부산광역시 부산진구 서면로 10',
    geometry: {
      type: 'Point',
      coordinates: [129.0637, 35.1601]
    }
  },
  {
    id: 'addr_5',
    jibunAddress: '부산광역시 부산진구 전포동 580-12',
    detailAddress: '서면메디컬빌딩',
    geometry: {
      type: 'Point',
      coordinates: [129.0638, 35.1602]
    }
  },
  // 당감동 지역
  {
    id: 'addr_6',
    roadAddress: '부산광역시 부산진구 당감로 51',
    jibunAddress: '부산광역시 부산진구 당감동 100-1',
    geometry: {
      type: 'Point',
      coordinates: [129.0545, 35.1486]
    }
  },
  {
    id: 'addr_7',
    jibunAddress: '부산광역시 부산진구 당감동 102-7',
    geometry: {
      type: 'Point',
      coordinates: [129.0546, 35.1487]
    }
  },
  {
    id: 'addr_8',
    roadAddress: '부산광역시 부산진구 당감중앙로 17',
    jibunAddress: '부산광역시 부산진구 당감동 55-3',
    detailAddress: '당감초등학교',
    geometry: {
      type: 'Point',
      coordinates: [129.0547, 35.1488]
    }
  },
  {
    id: 'addr_9',
    roadAddress: '부산광역시 부산진구 당감로 88',
    geometry: {
      type: 'Point',
      coordinates: [129.0548, 35.1489]
    }
  },
  {
    id: 'addr_10',
    jibunAddress: '부산광역시 부산진구 당감동 22-5',
    geometry: {
      type: 'Point',
      coordinates: [129.0549, 35.1490]
    }
  },
  // 초읍동 지역
  {
    id: 'addr_11',
    roadAddress: '부산광역시 부산진구 성지로 10번지 28',
    jibunAddress: '부산광역시 부산진구 초읍동 5-번',
    geometry: {
      type: 'Point',
      coordinates: [129.0745, 35.1612]
    }
  },
  {
    id: 'addr_12',
    jibunAddress: '부산광역시 부산진구 초읍동 402-11',
    geometry: {
      type: 'Point',
      coordinates: [129.0746, 35.1613]
    }
  },
  {
    id: 'addr_13',
    roadAddress: '부산광역시 부산진구 성지로 104번길 26',
    jibunAddress: '부산광역시 부산진구 초읍동 506-6',
    detailAddress: '초읍초등학교',
    geometry: {
      type: 'Point',
      coordinates: [129.0747, 35.1614]
    }
  },
  {
    id: 'addr_14',
    roadAddress: '부산광역시 부산진구 초읍중앙로 88-7',
    geometry: {
      type: 'Point',
      coordinates: [129.0748, 35.1615]
    }
  },
  {
    id: 'addr_15',
    jibunAddress: '부산광역시 부산진구 초읍동 615-3',
    geometry: {
      type: 'Point',
      coordinates: [129.0749, 35.1616]
    }
  },
  {
    id: 'addr_16',
    roadAddress: '부산광역시 부산진구 초읍로 25',
    jibunAddress: '부산광역시 부산진구 초읍동 712-8',
    geometry: {
      type: 'Point',
      coordinates: [129.0750, 35.1617]
    }
  },
  // 부전동 지역
  {
    id: 'addr_17',
    roadAddress: '부산광역시 부산진구 부전로 181',
    jibunAddress: '부산광역시 부산진구 부전동 255-6',
    detailAddress: '부전역',
    geometry: {
      type: 'Point',
      coordinates: [129.0603, 35.1639]
    }
  },
  {
    id: 'addr_18',
    jibunAddress: '부산광역시 부산진구 부전동 312-1',
    geometry: {
      type: 'Point',
      coordinates: [129.0604, 35.1640]
    }
  },
  {
    id: 'addr_19',
    roadAddress: '부산광역시 부산진구 중앙대로 692번길 10',
    geometry: {
      type: 'Point',
      coordinates: [129.0605, 35.1641]
    }
  },
  // 범천동 지역
  {
    id: 'addr_20',
    roadAddress: '부산광역시 부산진구 중앙대로 612',
    jibunAddress: '부산광역시 부산진구 범천동 45-2',
    detailAddress: '범내골역',
    geometry: {
      type: 'Point',
      coordinates: [129.0587, 35.1711]
    }
  },
  {
    id: 'addr_21',
    jibunAddress: '부산광역시 부산진구 범천동 88-9',
    geometry: {
      type: 'Point',
      coordinates: [129.0588, 35.1712]
    }
  },
  {
    id: 'addr_22',
    roadAddress: '부산광역시 부산진구 범내골로 29',
    jibunAddress: '부산광역시 부산진구 범천동 102-3',
    geometry: {
      type: 'Point',
      coordinates: [129.0589, 35.1713]
    }
  },
  // 개금동 지역
  {
    id: 'addr_23',
    roadAddress: '부산광역시 부산진구 개금로 15',
    jibunAddress: '부산광역시 부산진구 개금동 833-179',
    geometry: {
      type: 'Point',
      coordinates: [129.0234, 35.1543]
    }
  },
  {
    id: 'addr_24',
    jibunAddress: '부산광역시 부산진구 개금동 701-5',
    detailAddress: '개금주공아파트',
    geometry: {
      type: 'Point',
      coordinates: [129.0235, 35.1544]
    }
  },
  {
    id: 'addr_25',
    roadAddress: '부산광역시 부산진구 개금중앙로 88',
    geometry: {
      type: 'Point',
      coordinates: [129.0236, 35.1545]
    }
  },
  // 연지동 지역
  {
    id: 'addr_26',
    roadAddress: '부산광역시 부산진구 연지로 25',
    jibunAddress: '부산광역시 부산진구 연지동 123-8',
    detailAddress: '연지초등학교',
    geometry: {
      type: 'Point',
      coordinates: [129.0456, 35.1589]
    }
  },
  {
    id: 'addr_27',
    jibunAddress: '부산광역시 부산진구 연지동 205-11',
    geometry: {
      type: 'Point',
      coordinates: [129.0457, 35.1590]
    }
  }
];

// ============================================================================
// SimulationStore Class
// ============================================================================

class SimulationStore {
  // ============================================================================
  // Observable State
  // ============================================================================

  // 검색 상태
  searchQuery: string = '';
  searchResults: AddressSearchResult[] = [];
  isSearching: boolean = false;

  // 선택 상태
  selectedAddressId: string | null = null;

  // 시뮬레이션 설정
  config: SimulationConfig | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ============================================================================
  // 주소 검색
  // ============================================================================

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  /**
   * 주소 검색 수행 (Mock 데이터 사용)
   * 실제로는 API 호출: POST /api/simulation/search-address
   */
  async searchAddress(query: string): Promise<void> {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;

    try {
      // TODO: 실제 API 호출
      // const response = await fetch('/api/simulation/search-address', {
      //   method: 'POST',
      //   body: JSON.stringify({ query, city: '부산광역시', district: '부산진구' })
      // });
      // this.searchResults = await response.json();

      // Mock: 검색어가 포함된 결과만 필터링
      await new Promise(resolve => setTimeout(resolve, 300)); // 네트워크 지연 시뮬레이션

      this.searchResults = MOCK_ADDRESS_RESULTS.filter(result =>
        (result.roadAddress && result.roadAddress.includes(query)) ||
        (result.jibunAddress && result.jibunAddress.includes(query)) ||
        (result.detailAddress && result.detailAddress.includes(query))
      );
    } catch (error) {
      console.error('[SimulationStore] Address search failed:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  clearSearchResults() {
    this.searchResults = [];
    this.searchQuery = '';
  }

  // ============================================================================
  // 주소 선택
  // ============================================================================

  selectAddress(addressId: string) {
    this.selectedAddressId = addressId;
  }

  clearSelection() {
    this.selectedAddressId = null;
  }

  isAddressSelected(addressId: string): boolean {
    return this.selectedAddressId === addressId;
  }

  get selectedAddress(): AddressSearchResult | null {
    if (!this.selectedAddressId) return null;
    return this.searchResults.find(result => result.id === this.selectedAddressId) || null;
  }

  // ============================================================================
  // 시뮬레이션 설정
  // ============================================================================

  setConfig(config: SimulationConfig) {
    this.config = config;
  }

  clearConfig() {
    this.config = null;
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get hasSearchResults(): boolean {
    return this.searchResults.length > 0;
  }

  get hasSelectedAddress(): boolean {
    return this.selectedAddressId !== null;
  }

  get hasConfig(): boolean {
    return this.config !== null;
  }
}

export const simulationStore = new SimulationStore();
