import { observer } from 'mobx-react-lite';
import AddressResultItem from './AddressResultItem';
import { simulationStore } from '@/stores/SimulationStore';

const AddressResultList = observer(function AddressResultList() {
  const { searchResults, selectedAddressId, isSearching } = simulationStore;

  const handleSelect = (id: string) => {
    simulationStore.selectAddress(id);
  };

  if (isSearching) {
    return (
      <div
        className="flex flex-col items-start self-stretch gap-2 px-1 py-1"
        style={{
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      >
        {[1, 2, 3].map((index) => (
          <div
            key={`skeleton-${index}`}
            className="bg-[#1A1A1A] rounded p-3 animate-pulse w-full"
          >
            <div className="w-3/4 h-4 bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (searchResults.length === 0) {
    return null; // 검색 결과가 없으면 아무것도 표시하지 않음
  }

  return (
    <div
      className="flex flex-col items-start self-stretch gap-2 px-1 py-1"
      style={{
        maxHeight: '300px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#FFD040 transparent'
      }}
    >
      {searchResults.map((result) => (
        <AddressResultItem
          key={result.id}
          result={result}
          isSelected={result.id === selectedAddressId}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
});

export default AddressResultList;
