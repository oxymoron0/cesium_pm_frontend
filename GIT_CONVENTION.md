# Git Convention

## 기본 원칙

### 1. 기능과 용도별 분리
- 각 커밋은 하나의 기능 또는 목적만 포함해야 합니다
- 서로 다른 기능은 별도의 커밋으로 분리합니다
- 관련 없는 변경사항은 함께 커밋하지 않습니다

### 2. 파일별 세분화된 Add
- 파일을 통째로 add하지 않습니다
- 파일을 읽고 분석한 후 기능에 따라 라인별로 add합니다
- `git add -p` 명령어를 활용하여 선택적으로 변경사항을 추가합니다
- 하나의 파일에 여러 기능이 포함된 경우 기능별로 분리하여 커밋합니다

## 커밋 메시지 규칙

### 타입 (Type)
다음 타입 중 하나를 사용해야 합니다:

- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서화 작업 (README, 주석 등)
- **style**: 코드 스타일 변경 (포맷팅, 세미콜론 누락 등, 로직 변경 없음)
- **refactor**: 코드 리팩토링 (기능 변경 없이 코드 구조 개선)
- **test**: 테스트 추가 또는 수정
- **chore**: 기타 작업 (빌드 설정, 패키지 매니저 설정 등)
- **build**: 빌드 시스템 또는 외부 의존성 변경
- **ci**: CI 설정 파일 및 스크립트 변경
- **perf**: 성능 개선
- **rename**: 파일 또는 폴더명 변경
- **remove**: 파일 또는 코드 삭제

### 커밋 메시지 형식
```
<타입>: <제목>

<본문>
```

## 커밋 작성 가이드라인

1. **제목은 50자 이내로 작성**
2. **제목 첫 글자는 대문자로 시작**
3. **제목 끝에 마침표 사용하지 않음**
4. **본문은 72자마다 줄바꿈**
5. **본문에서 변경 이유와 방법을 설명**
6. **이슈 번호가 있다면 본문 하단에 참조**

### 커밋 히스토리 보안
- **민감한 정보가 포함된 커밋은 히스토리에서 완전 제거**
- **`git log -p`나 `git show`로도 확인할 수 없도록 처리**
- **필요시 `git rebase`, `git reset` 등을 사용하여 히스토리 재작성**

## 세분화 원칙 및 예시

### 세분화 기준
- **한 파일에 여러 기능이 있다면 기능별로 분리**
- **인터페이스, 구현체, 테스트는 각각 별도 커밋**
- **타입 정의, 비즈니스 로직, UI 연동은 분리**
- **설정 변경과 기능 구현은 분리**

### 잘못된 세분화 (지양)
```bash
# 너무 큰 단위 - 여러 기능이 한 커밋에
feat: Implement Route system
- Add API types
- Add RouteStore 
- Add UI integration
- Update documentation

# 총 1개 커밋 (지양)
```

### 올바른 세분화 (권장)
```bash
# API 레이어 세분화
feat: Add RouteInfo interface for basic route data
feat: Add GeoJSON Polygon types for geometry handling  
feat: Add Station interface for location data
feat: Add common API response wrapper types

# Store 레이어 세분화  
feat: Add RouteStore observable structure
feat: Implement route data management methods
feat: Add route selection state handling
feat: Implement loading state management
feat: Add error handling for API failures
feat: Add automatic data loading lifecycle

# API 통신 레이어 세분화
feat: Add getRouteInfo API function
feat: Add getRouteGeometry API function  
feat: Add API error handling utilities

# Rendering 레이어 세분화
feat: Add GeoJSON to Cartesian3 conversion
feat: Add Entity creation for route polygons
feat: Add DataSource management for routes
feat: Add route clearing functionality

# UI 연동 세분화
feat: Connect RouteCard with RouteStore selection
feat: Add loading states to RouteCard component
feat: Integrate route rendering with Monitoring component
feat: Add automatic rendering on component mount

# 설정 및 문서화
chore: Update API configuration exports
chore: Add RouteStore to global state management
docs: Update technical specification with Route system

# 총 17-20개 커밋 (권장)
```

### 파일별 세분화 예시

```bash
# 하나의 큰 파일을 기능별로 분리
git add -p src/stores/RouteStore.ts  # 인터페이스 부분만
git commit -m "feat: Add RouteStore interface and observables"

git add -p src/stores/RouteStore.ts  # 데이터 관리 메서드만  
git commit -m "feat: Add route data management methods"

git add -p src/stores/RouteStore.ts  # 상태 관리 부분만
git commit -m "feat: Add selection state management"

git add -p src/stores/RouteStore.ts  # 로딩 처리 부분만
git commit -m "feat: Add loading and error state handling"
```

## 핵심 원칙: "롤백 독립성"

> **"이 커밋 하나만 롤백해도 다른 기능에 영향 없는가?"**

이것이 커밋 세분화의 **가장 중요한 기준**입니다.

### 롤백 독립성 검증법
```bash
# 1. 특정 커밋만 롤백 테스트
git log --oneline -5
git revert <commit-hash> --no-commit

# 2. 빌드 및 기능 확인
npm run build
npm run test

# 3. 다른 기능들이 정상 작동하는지 확인
# 4. 문제없으면 해당 커밋은 잘 분리된 것

git reset --hard HEAD  # 테스트 되돌리기
```

### 롤백 독립성 기반 세분화 예시

#### ❌ 잘못된 세분화 (롤백 시 연쇄 영향)
```bash
feat: Add Route system with API and UI integration
# 문제: 이 커밋을 롤백하면 API, Store, UI 모두 깨짐
```

#### ✅ 올바른 세분화 (롤백 독립성 보장)
```bash
feat: Add RouteInfo type definition
# 롤백 시: 타입만 제거, 다른 기능 무관

feat: Add Route API service layer  
# 롤백 시: API 호출만 불가, UI는 목업으로 작동 가능

feat: Add RouteStore data management
# 롤백 시: Store만 제거, API와 UI는 독립적

feat: Connect RouteStore to RouteCard UI
# 롤백 시: UI만 정적 상태로 복귀, Store는 유지
```

### 롤백 독립성 보장 방법

#### 1. **인터페이스 우선 설계**
```bash
# 먼저 인터페이스 정의
git commit -m "feat: Add Route interface definitions"

# 그 다음 구현체  
git commit -m "feat: Implement RouteStore data management"

# 마지막에 연동
git commit -m "feat: Connect RouteStore to UI components"
```

#### 2. **Mock/Stub 활용**
```bash
# API 없이도 작동하는 Store
git commit -m "feat: Add RouteStore with mock data support"

# 실제 API 연동 (Store 변경 최소화)
git commit -m "feat: Replace mock data with real API calls"
```

#### 3. **기능별 Feature Flag 패턴**
```bash
# 기능 추가 (비활성화 상태)
git commit -m "feat: Add route rendering system (disabled)"

# 기능 활성화
git commit -m "feat: Enable route rendering in Monitoring page"
```

### 품질 기준 (롤백 독립성 중심)

#### **우수**: 완전한 롤백 독립성
- 각 커밋을 개별적으로 롤백해도 다른 기능 정상 작동
- 빌드 깨짐 없음
- 사용자 기능에 영향 없음

#### **양호**: 부분적 롤백 독립성  
- 일부 커밋 롤백 시 관련 기능만 비활성화
- 빌드는 유지됨
- 핵심 기능은 정상 작동

#### **개선 필요**: 롤백 연쇄 영향
- 하나 롤백하면 여러 기능 영향
- 빌드 에러 가능성
- 추가 수정 작업 필요

#### **부족**: 롤백 불가능
- 롤백 시 전체 시스템 마비
- 빌드 깨짐 확실
- 연쇄적 수정 작업 필수

### 커밋 검증 체크리스트
- [ ] **롤백 독립성**: 이 커밋만 롤백해도 다른 기능에 영향 없는가?
- [ ] **빌드 안정성**: 롤백 후에도 빌드가 성공하는가?
- [ ] **기능 독립성**: 관련 없는 기능들이 정상 작동하는가?
- [ ] **단일 목적성**: 하나의 명확한 목적만 가지는가?
- [ ] **이해 용이성**: 커밋 메시지만으로 변경 내용을 파악할 수 있는가?

### Claude Code 개발자 준수 원칙
> Claude Code 개발자는 이 롤백 독립성 원칙을 반드시 준수해야 하며,  
> 커밋 전 반드시 롤백 테스트를 통해 독립성을 검증해야 합니다.