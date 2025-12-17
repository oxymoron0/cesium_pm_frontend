import type { ServiceType } from '../types';
import { SERVICE_CONFIGS } from '../types';
import { getBasePath, isCivil } from '@/utils/env';

interface ServiceSwitcherProps {
  currentService: ServiceType;
  onServiceChange: (service: ServiceType) => void;
}

const SERVICE_ICONS: Record<ServiceType, string> = {
  monitoring: 'monitoring',
  simulation: 'simulation',
  priority: 'priority',
};

function ServiceSwitcher({ currentService, onServiceChange }: ServiceSwitcherProps) {
  const basePath = getBasePath();
  const civilMode = isCivil();

  // Civil 모드에서는 우선순위 서비스를 숨김
  const availableServices = civilMode
    ? SERVICE_CONFIGS.filter((service) => service.id !== 'priority')
    : SERVICE_CONFIGS;

  return (
    <div className="fixed top-[40px] right-[84px] z-[1500]">
      {/* Pill-shaped Panel */}
      <div
        className="flex items-center gap-4 px-6 py-3 rounded-full border border-[#C4C6C6] bg-black/80"
      >
        {availableServices.map((service) => {
          const isActive = service.id === currentService;
          return (
            <button
              key={service.id}
              onClick={() => onServiceChange(service.id)}
              className="flex flex-col items-center justify-center h-[56px] py-[12px] cursor-pointer transition-all duration-200 hover:opacity-80"
            >
              {/* Icon Container - fixed size for consistent alignment */}
              <div className="flex items-center justify-center w-[28px] h-[28px]">
                <img
                  src={`${basePath}icon/${SERVICE_ICONS[service.id]}.svg`}
                  alt={service.label}
                  className="max-w-[28px] max-h-[28px] object-contain"
                  style={{
                    filter: isActive
                      ? 'brightness(0) saturate(100%) invert(79%) sepia(67%) saturate(497%) hue-rotate(358deg) brightness(103%) contrast(101%)'
                      : 'none',
                  }}
                />
              </div>
              {/* Label - fixed height for consistent alignment */}
              <span
                className="flex items-center justify-center h-[16px] text-sm text-center leading-none"
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#FFD040' : '#696A6A',
                }}
              >
                {service.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceSwitcher;
