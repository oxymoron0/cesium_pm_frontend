# Figma MCP UI 구현 레퍼런스

**Version**: 1.0
**Updated**: 2025-10-10

---

## 기존 컴포넌트 구조

### src/components/basic/

**레이아웃:**
- `Panel.tsx` - 메인 컨테이너 (position: left/right/center, width, maxHeight)
- `Spacer.tsx` - 간격 조절 (height prop)
- `Divider.tsx` - 구분선 (color prop)

**타이포그래피:**
- `Title.tsx` - 페이지 제목 + info + close/minimize 버튼 + Divider
- `SubTitle.tsx` - 섹션 제목 (42px height)

**인터랙션:**
- `Button.tsx` - 버튼 (variant: solid/outline, showIcon: boolean)
- `TabNavigation.tsx` - 탭 전환 (tabs[], activeTab, onTabChange)
- `Icon.tsx` - SVG 아이콘 래퍼 (name, className, onClick)

**입력:**
- `SearchInput.tsx` - 검색 입력 필드
- `InputField.tsx` - Label + Icon + Input (48px label + flex-1)
- `Select.tsx` - Label + Dropdown (48px label + flex-1)

**리스트:**
- `Item.tsx` - 88px 높이 리스트 아이템 (검정 배경 + 회색 테두리)

### src/components/service/

- `RouteCard.tsx` - Item 기반, 노선 번호 + 설명 + 북마크
- `StationCard.tsx` - Item 기반, 정류장 이름 + 설명 + 북마크
- `SensorInfoContainer.tsx` - 98px 원형 프로그레스 바 + 센서 정보

---

## Figma MCP 워크플로우

### URL 파싱
```
https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
nodeId 형식: 1468-9826 → 1468:9826 (하이픈을 콜론으로 변환)
```

### 3단계 호출

**1. get_screenshot**
```typescript
mcp__figma-remote-mcp__get_screenshot({
  fileKey, nodeId,
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react"
})
```
목적: 시각적 확인, 색상/폰트/간격 파악

**2. get_metadata (선택적)**
```typescript
mcp__figma-remote-mcp__get_metadata({ fileKey, nodeId })
```
목적: XML 구조 확인, 하위 nodeId 파악

**3. get_code**
```typescript
mcp__figma-remote-mcp__get_code({ fileKey, nodeId })
```
목적: 색상값, 간격, 폰트 크기 추출 (코드는 참고용, 직접 사용 금지)

---

## 구현 프로세스

### 1. 컴포넌트 분석
```bash
# Glob으로 기존 컴포넌트 탐색
src/components/basic/**/*.tsx
src/components/service/**/*.tsx

# Read로 유사 페이지 패턴 학습
src/pages/Monitoring/components/*.tsx
```

### 2. 재사용 판단
**재사용 조건:**
- 기존 컴포넌트의 구조와 스타일이 Figma 디자인과 일치
- Props 추가만으로 요구사항 충족 가능
- 기존 사용처에 영향 없이 확장 가능

**신규 생성 조건:**
- 기존 컴포넌트와 구조가 다름 (예: Label + Input 조합)
- 2개 이상 페이지에서 재사용 예상
- Props 확장으로 해결 불가능한 UI 패턴

### 3. 컴포넌트 확장 패턴
```typescript
// Props 추가 시 기본값 설정으로 기존 사용처 호환성 유지
interface ButtonProps {
  variant?: 'solid' | 'outline';  // 기본값: 'solid'
  showIcon?: boolean;              // 기본값: true
}
```

---

## 레이아웃 패턴

### Panel 기반 구조
```typescript
<Panel position="left" width="540px" maxHeight="calc(100vh - 160px)">
  <Title onClose={onClose}>페이지 제목</Title>
  <Spacer height={16} />

  <div className="self-stretch">캡션</div>
  <Spacer height={16} />

  <SubTitle>섹션 제목</SubTitle>
  <Divider />
  <Spacer height={16} />

  <div className="flex flex-col gap-4 self-stretch">
    <div className="flex gap-4 w-full">
      <InputField className="flex-1" />
      <InputField className="flex-1" />
    </div>
  </div>

  <Spacer height={36} />

  <div className="flex flex-col gap-4 border-t border-[#696A6A] pt-9 self-stretch">
    <Button variant="outline" showIcon={false}>버튼1</Button>
    <Button variant="solid" showIcon={false}>버튼2</Button>
  </div>
</Panel>
```

### 필수 클래스

**self-stretch**: 부모 Panel 폭 전체 사용 (최상위 컨테이너에 필수)
```typescript
<div className="flex flex-col gap-4 self-stretch">
```

**w-full**: flex 컨테이너 내 100% 폭 명시
```typescript
<div className="flex gap-4 w-full">
  <InputField className="flex-1" />
  <InputField className="flex-1" />
</div>
```

**flex-1**: flex 컨테이너 내 균등 분배
```typescript
// 50% 폭 + placeholder
<div className="flex gap-4 w-full">
  <Select className="flex-1" />
  <div className="flex-1" />  {/* 빈 공간 */}
</div>
```

### 간격 관리

**Spacer**: 섹션 간 수직 간격
```typescript
<Spacer height={16} />  // 일반 구분
<Spacer height={36} />  // 큰 구분
```

**gap**: 컨테이너 내부 일관된 간격
```typescript
gap-2 (8px)   // 밀접한 요소
gap-3 (12px)  // 폼 필드 그룹
gap-4 (16px)  // 섹션 내 요소
```

---

## 스타일 규칙

### 색상 (Figma 정확도 우선)
```typescript
// Figma 색상값 직접 사용
border: '#696A6A'      // 기본 테두리
border: '#C3C3C3'      // 밝은 테두리
text: '#FFFFFF'        // 기본 텍스트
text: '#A6A6A6'        // 보조 텍스트
accent: '#FFD040'      // 강조
accentBright: '#CFFF40' // 버튼 배경

// Tailwind 기본 색상 사용 금지 (gray-600 대신 #696A6A)
```

### Pretendard 폰트
```typescript
// 필수 속성
style={{
  fontFamily: 'Pretendard',
  fontSize: '14px',      // Figma 기준
  fontWeight: '700',     // 반드시 명시
  lineHeight: 'normal'
}}

// 크기 체계
24px - Title
18px - SubTitle
16px - Button, Label
14px - Caption, Input Value
12px - 보조 정보

// 굵기 체계
400 - Regular (본문, 입력값)
600 - Semibold (라벨)
700 - Bold (제목, 버튼)
```

---

## MockUp 데이터 설계

### 상태 관리
```typescript
// 계산 가능한 값은 상태로 관리하지 않음
const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

// 사용자 선택값만 useState
const [city, setCity] = useState('부산시');
const [district, setDistrict] = useState('부산진구');

// 옵션 데이터 (향후 API 로드용)
const cityOptions = [
  { value: '부산시', label: '부산시' }
];
```

### API 연동 준비 구조
```typescript
// 현재: 정적 배열
const options = [{ value: '부산시', label: '부산시' }];

// 향후: useState + useEffect
const [options, setOptions] = useState<SelectOption[]>([]);
useEffect(() => {
  fetchOptions().then(setOptions);
}, []);
```

---

## 신규 컴포넌트 생성

### InputField 패턴
```typescript
// Label 48px 고정 + Input flex-1
<div className={`flex items-center gap-[7px] h-8 ${className}`}>
  <div style={{ width: '48px', flexShrink: 0 }}>{label}</div>
  <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-black rounded border border-[#696A6A]">
    {icon && <Icon name={icon} className="w-4 h-4" />}
    <div>{value}</div>
  </div>
</div>
```

### Select 패턴
```typescript
// Label 48px 고정 + Select flex-1
<div className={`flex items-center gap-[7px] h-8 ${className}`}>
  <div style={{ width: '48px', flexShrink: 0 }}>{label}</div>
  <div className="flex-1 relative">
    <select className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] appearance-none">
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">▼</div>
  </div>
</div>
```

### 아이콘 생성
```xml
<!-- public/icon/name.svg (16x16) -->
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <rect stroke="white" stroke-width="1.5" fill="none"/>
</svg>
```

---

## 트러블슈팅

### 레이아웃 폭 문제
**증상:** 요소가 내용물 크기만큼만 표시
**원인:** self-stretch 또는 w-full 누락
**해결:** 컨테이너에 self-stretch, flex 컨테이너에 w-full 추가

### flex-1 미작동
**증상:** 균등 분배되지 않음
**원인:** 부모가 flex가 아니거나 w-full 없음
**해결:** 부모에 `flex gap-4 w-full` 추가

### Figma 색상 불일치
**원인:** Tailwind 기본 색상 사용 (gray-600 등)
**해결:** Figma 색상값 직접 사용 (#696A6A)

### 폰트 미적용
**원인:** font-weight 누락
**해결:** fontWeight 명시 ('400', '600', '700')

### ESLint unused variables
**원인:** 선언 후 미사용 변수
**해결:** 계산 가능한 값은 const로 직접 계산, 불필요한 useState 제거

---

## 빌드 검증

```bash
# 필수 검증 순서
pnpm lint                          # unused variables, type errors
npx tsc --noEmit                   # TypeScript 타입 체크
VITE_PAGE=PageName pnpm build      # 빌드 성공 확인
```

---

## 케이스별 접근법

### Case 1: 기존 컴포넌트로 충족 가능
1. Glob으로 basic/service 컴포넌트 탐색
2. Read로 유사 컴포넌트 확인
3. Props 조합으로 UI 구성
4. 부족한 부분은 Props 확장 (variant, size 등)

### Case 2: 신규 컴포넌트 필요
1. 재사용 가능성 평가
2. basic 또는 service 위치 결정
3. Label 48px 고정 + flex-1 패턴 적용
4. Figma 색상/폰트/간격 정확히 추출

### Case 3: 기존 페이지 패턴 활용
1. Monitoring 페이지 구조 학습
2. Panel + Title + Spacer + Divider 기본 구조
3. self-stretch + w-full 레이아웃 패턴
4. MobX observer 패턴 적용

---

## 참고

**관련 문서:**
- `/CLAUDE_PROJECT.md` - 프로젝트 개요
- `/pm-frontend/CLAUDE_PROJECT.md` - Frontend 기술 스펙
- `/CLAUDE.md` - 작업 원칙

**주요 파일:**
- `src/components/basic/` - 기본 컴포넌트
- `src/components/service/` - 도메인 컴포넌트
- `src/pages/Monitoring/` - 참고 구현 패턴

**Figma MCP:**
- `get_screenshot` - 시각적 확인
- `get_metadata` - 구조 분석
- `get_code` - 색상/간격 추출

---

**End of Document**
