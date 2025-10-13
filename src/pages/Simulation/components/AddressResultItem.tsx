import { useState } from 'react';
import type { AddressSearchResult } from '../types';

interface AddressResultItemProps {
  result: AddressSearchResult;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function AddressResultItem({ result, isSelected, onSelect }: AddressResultItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isHighlighted = isSelected || isHovered;

  const renderAddressLine = (label: string, address: string, showDetail: boolean) => (
    <div className="flex items-start gap-2">
      {/* Type Label */}
      <div
        className="flex-shrink-0"
        style={{
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '600',
          lineHeight: '20px',
          color: isHighlighted ? '#000' : '#FFD040'
        }}
      >
        {label}
      </div>

      {/* Separator */}
      <div
        style={{
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '20px',
          color: isHighlighted ? '#000' : '#FFF'
        }}
      >
        |
      </div>

      {/* Address */}
      <div
        className="flex-1"
        style={{
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '20px',
          color: isHighlighted ? '#000' : '#FFF'
        }}
      >
        {address} {showDetail && result.detailAddress && <span>{result.detailAddress}</span>}
      </div>
    </div>
  );

  // 건물명은 지번 주소에 표시, 지번이 없으면 도로명에 표시
  const showDetailOnRoad = !result.jibunAddress && !!result.detailAddress;
  const showDetailOnJibun = !!result.jibunAddress && !!result.detailAddress;

  return (
    <div
      className="flex flex-col self-stretch gap-1 px-4 py-3 cursor-pointer transition-colors"
      style={{
        background: isHighlighted ? '#FFD040' : '#1A1A1A',
        borderRadius: '4px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(result.id)}
    >
      {result.roadAddress && renderAddressLine('도로명', result.roadAddress, showDetailOnRoad)}
      {result.jibunAddress && renderAddressLine('지번', result.jibunAddress, showDetailOnJibun)}
    </div>
  );
}
